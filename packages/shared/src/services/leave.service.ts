/**
 * 有給休暇管理サービス
 *
 * - FIFO消化（古い付与分から順に消化）
 * - 残日数計算
 * - 年5日取得義務モニタリング
 * - 法定付与日数テーブル
 */

import { prisma } from '../db'
import type { PrismaClient } from '@prisma/client'

// ── 法定付与日数テーブル（フルタイム） ────────────────
const GRANT_TABLE: { yearsOfService: number; days: number }[] = [
  { yearsOfService: 0.5, days: 10 },
  { yearsOfService: 1.5, days: 11 },
  { yearsOfService: 2.5, days: 12 },
  { yearsOfService: 3.5, days: 14 },
  { yearsOfService: 4.5, days: 16 },
  { yearsOfService: 5.5, days: 18 },
  { yearsOfService: 6.5, days: 20 },
]

/**
 * 勤続年数から法定付与日数を算出
 */
export function getLegalGrantDays(yearsOfService: number): number {
  // 6.5年以上は一律20日
  for (let i = GRANT_TABLE.length - 1; i >= 0; i--) {
    if (yearsOfService >= GRANT_TABLE[i].yearsOfService) {
      return GRANT_TABLE[i].days
    }
  }
  return 0 // 0.5年未満は付与なし
}

/**
 * 入社日から勤続年数を計算
 */
export function getYearsOfService(hireDate: Date, asOf: Date = new Date()): number {
  const diff = asOf.getTime() - hireDate.getTime()
  return diff / (365.25 * 24 * 60 * 60 * 1000)
}

// ── FIFO消化ロジック ─────────────────────────────────

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

/**
 * 有給休暇をFIFO（古い付与分から順）で消化する
 *
 * @param userId    対象ユーザーID
 * @param daysToDeduct  消化日数（0.5単位対応）
 * @param tx        トランザクションクライアント（省略時はprisma直接使用）
 * @returns 消化結果
 */
export async function deductPaidLeaveFIFO(
  userId: string,
  daysToDeduct: number,
  tx?: TxClient
): Promise<{ success: boolean; deducted: number; remaining: number; error?: string }> {
  const db = tx || prisma

  // 有効な付与（未失効かつ残日数あり）を失効日昇順で取得
  const grants = await db.paidLeaveGrant.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: 'asc' },
  })

  // 残日数を計算
  const totalRemaining = grants.reduce(
    (sum, g) => sum + (g.grantedDays + g.carriedOverDays - g.usedDays - g.expiredDays),
    0
  )

  if (totalRemaining < daysToDeduct) {
    return {
      success: false,
      deducted: 0,
      remaining: totalRemaining,
      error: `有給残日数が不足しています（残${totalRemaining}日、必要${daysToDeduct}日）`,
    }
  }

  let remaining = daysToDeduct

  for (const grant of grants) {
    if (remaining <= 0) break

    const available = grant.grantedDays + grant.carriedOverDays - grant.usedDays - grant.expiredDays
    if (available <= 0) continue

    const deductFromThis = Math.min(available, remaining)

    await db.paidLeaveGrant.update({
      where: { id: grant.id },
      data: { usedDays: grant.usedDays + deductFromThis },
    })

    remaining -= deductFromThis
  }

  // User.paidLeaveBalanceも更新
  await db.user.update({
    where: { id: userId },
    data: { paidLeaveBalance: { decrement: daysToDeduct } },
  })

  return {
    success: true,
    deducted: daysToDeduct,
    remaining: totalRemaining - daysToDeduct,
  }
}

/**
 * 有給休暇の現在有効残日数を取得
 */
export async function getPaidLeaveBalance(userId: string): Promise<{
  totalRemaining: number
  grants: Array<{
    id: string
    grantDate: Date
    expiresAt: Date
    granted: number
    used: number
    expired: number
    remaining: number
  }>
}> {
  const grants = await prisma.paidLeaveGrant.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: 'asc' },
  })

  const detailed = grants.map(g => {
    const remaining = g.grantedDays + g.carriedOverDays - g.usedDays - g.expiredDays
    return {
      id: g.id,
      grantDate: g.grantDate,
      expiresAt: g.expiresAt,
      granted: g.grantedDays,
      used: g.usedDays,
      expired: g.expiredDays,
      remaining: Math.max(0, remaining),
    }
  })

  return {
    totalRemaining: detailed.reduce((sum, g) => sum + g.remaining, 0),
    grants: detailed,
  }
}

// ── 年5日取得義務チェック ─────────────────────────────

export type ObligationAlertLevel = 'ok' | 'yellow' | 'orange' | 'red'

export interface Annual5DayCheckResult {
  userId: string
  takenDays: number
  remainingObligation: number
  monthsLeft: number
  alertLevel: ObligationAlertLevel
}

/**
 * 年5日取得義務のチェック
 *
 * 有給付与日を起算点として、1年以内に5日取得しているか判定
 *
 * @param userId       対象ユーザーID
 * @param grantDate    直近の有給付与日（起算点）
 */
export async function checkAnnual5DayObligation(
  userId: string,
  grantDate: Date
): Promise<Annual5DayCheckResult> {
  const endDate = new Date(grantDate)
  endDate.setFullYear(endDate.getFullYear() + 1)

  const now = new Date()
  const monthsLeft = Math.max(0, (endDate.getTime() - now.getTime()) / (30.44 * 24 * 60 * 60 * 1000))

  // 期間内の有給使用日数を集計
  const grantDateStr = grantDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: 'approved',
      type: { in: ['vacation', 'half-am', 'half-pm'] },
      startDate: { gte: grantDateStr, lt: endDateStr },
    },
  })

  const takenDays = leaveRequests.reduce((sum, lr) => sum + lr.days, 0)
  const remainingObligation = Math.max(0, 5 - takenDays)

  // アラートレベル判定
  let alertLevel: ObligationAlertLevel = 'ok'
  if (takenDays >= 5) {
    alertLevel = 'ok'
  } else if (monthsLeft <= 1 && remainingObligation > 0) {
    alertLevel = 'red'      // 残1ヶ月で未達
  } else if (monthsLeft <= 3 && remainingObligation >= 3) {
    alertLevel = 'orange'   // 残3ヶ月で3日以上未取得
  } else if (monthsLeft <= 6 && remainingObligation >= 3) {
    alertLevel = 'yellow'   // 残6ヶ月で3日以上未取得
  }

  return {
    userId,
    takenDays,
    remainingObligation,
    monthsLeft: Math.round(monthsLeft * 10) / 10,
    alertLevel,
  }
}

// ── 有給年次自動付与（バッチ用） ─────────────────────

/**
 * 入社日基準で有給を自動付与する（バッチジョブから呼出）
 *
 * 毎日実行し、本日が付与日に該当するユーザーを検出して付与する
 */
export async function grantAnnualPaidLeave(): Promise<{
  granted: Array<{ userId: string; employeeNumber: string; days: number }>
}> {
  const today = new Date()
  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: { id: true, employeeNumber: true, hireDate: true, paidLeaveBalance: true },
  })

  const granted: Array<{ userId: string; employeeNumber: string; days: number }> = []

  for (const user of users) {
    const hireDate = new Date(user.hireDate)
    const yearsOfService = getYearsOfService(hireDate, today)

    // 各付与タイミングをチェック（0.5年, 1.5年, 2.5年...）
    for (const entry of GRANT_TABLE) {
      const grantDate = new Date(hireDate)
      grantDate.setMonth(grantDate.getMonth() + Math.round(entry.yearsOfService * 12))

      // 本日が付与日かチェック（月日が一致）
      if (
        grantDate.getMonth() === today.getMonth() &&
        grantDate.getDate() === today.getDate() &&
        yearsOfService >= entry.yearsOfService
      ) {
        // 既に同日の付与があるかチェック
        const todayStr = today.toISOString().split('T')[0]
        const existing = await prisma.paidLeaveGrant.findFirst({
          where: {
            userId: user.id,
            grantDate: {
              gte: new Date(todayStr + 'T00:00:00Z'),
              lt: new Date(todayStr + 'T23:59:59Z'),
            },
          },
        })

        if (!existing) {
          const expiresAt = new Date(today)
          expiresAt.setFullYear(expiresAt.getFullYear() + 2) // 2年で時効

          await prisma.$transaction([
            prisma.paidLeaveGrant.create({
              data: {
                userId: user.id,
                grantDate: today,
                grantedDays: entry.days,
                expiresAt,
              },
            }),
            prisma.user.update({
              where: { id: user.id },
              data: { paidLeaveBalance: { increment: entry.days } },
            }),
          ])

          granted.push({
            userId: user.id,
            employeeNumber: user.employeeNumber,
            days: entry.days,
          })
        }
        break // 同日に2回付与しない
      }
    }
  }

  return { granted }
}

// ── 有給時効処理（バッチ用） ─────────────────────────

/**
 * 時効を過ぎた有給付与の失効処理
 */
export async function expirePaidLeaves(): Promise<{
  expired: Array<{ userId: string; grantId: string; expiredDays: number }>
}> {
  const now = new Date()

  // 失効日を過ぎたが未処理の付与を取得
  const grants = await prisma.paidLeaveGrant.findMany({
    where: {
      expiresAt: { lte: now },
      expiredDays: 0, // まだ失効処理されていない
    },
    include: { user: { select: { id: true } } },
  })

  const expired: Array<{ userId: string; grantId: string; expiredDays: number }> = []

  for (const grant of grants) {
    const remaining = grant.grantedDays + grant.carriedOverDays - grant.usedDays
    if (remaining <= 0) continue

    await prisma.$transaction([
      prisma.paidLeaveGrant.update({
        where: { id: grant.id },
        data: { expiredDays: remaining },
      }),
      prisma.user.update({
        where: { id: grant.userId },
        data: { paidLeaveBalance: { decrement: remaining } },
      }),
    ])

    expired.push({
      userId: grant.userId,
      grantId: grant.id,
      expiredDays: remaining,
    })
  }

  return { expired }
}
