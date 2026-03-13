/**
 * 有給休暇管理サービス（就業規則 第59条準拠）
 *
 * ■ 付与ルール
 *   - 入社時: 2日付与
 *   - 基準日方式（1〜6月入社→基準日6/30 付与日7/1、7〜12月入社→基準日12/31 付与日1/1）
 *   - 入社日〜最初の基準日が6ヶ月未満の場合、6ヶ月勤続とみなす
 *   - 勤続年数に応じた付与: 6ヶ月→8日、1年→11日、2年→12日、3年→14日、4年→16日、5年→18日、6年以上→20日
 *
 * ■ 消化ルール
 *   - FIFO方式（古い付与分から優先消化）
 *   - 2年で失効
 *   - 年5日取得義務モニタリング
 *   - 半休対応（午前半休/午後半休 = 0.5日）
 */

import { prisma } from '../db'
import type { PrismaClient } from '@prisma/client'
import { PAID_LEAVE_GRANT_TABLE, getReferenceDate } from '../constants'

// ── 付与日数テーブル（就業規則 第59条） ────────────────

/**
 * 勤続年数から付与日数を算出（第59条テーブル準拠）
 *
 * | 勤続年数 | 入社時 | 6ヶ月 | 1年 | 2年 | 3年 | 4年 | 5年 | 6年以上 |
 * | 付与日数 |   2    |   8   |  11 |  12 |  14 |  16 |  18 |   20   |
 */
export function getGrantDaysByTenure(yearsOfService: number): number {
  // テーブルを逆順に走査し、該当する最大の勤続年数エントリを返す
  for (let i = PAID_LEAVE_GRANT_TABLE.length - 1; i >= 0; i--) {
    if (yearsOfService >= PAID_LEAVE_GRANT_TABLE[i].years) {
      return PAID_LEAVE_GRANT_TABLE[i].days
    }
  }
  return 0
}

/**
 * 入社日から勤続年数を計算
 */
export function getYearsOfService(hireDate: Date, asOf: Date = new Date()): number {
  const diff = asOf.getTime() - hireDate.getTime()
  return diff / (365.25 * 24 * 60 * 60 * 1000)
}

// ── 基準日・付与日計算 ──────────────────────────────────

/**
 * 入社日から最初の基準日を算出
 *
 * 第59条第2項:
 *   (1) 1月1日〜6月30日入社 → 基準日 6月30日
 *   (2) 7月1日〜12月31日入社 → 基準日 12月31日
 */
export function getFirstReferenceDate(hireDate: Date): Date {
  const ref = getReferenceDate(hireDate)
  const hireYear = hireDate.getFullYear()

  // 同年の基準日
  const firstRef = new Date(hireYear, ref.month - 1, ref.day)

  // 入社日が基準日以降なら翌回の基準日（半年後）
  if (hireDate > firstRef) {
    if (ref.month === 6) {
      return new Date(hireYear, 11, 31) // 12/31
    } else {
      return new Date(hireYear + 1, 5, 30) // 翌年6/30
    }
  }

  return firstRef
}

/**
 * 入社日から最初の付与日を算出
 *
 * 第59条第3項:
 *   (1) 基準日6/30の者 → 付与日 7/1
 *   (2) 基準日12/31の者 → 付与日 1/1
 */
export function getFirstGrantDate(hireDate: Date): Date {
  const firstRef = getFirstReferenceDate(hireDate)
  const refMonth = firstRef.getMonth() // 0-indexed

  if (refMonth === 5) {
    // 基準日6/30 → 付与日7/1
    return new Date(firstRef.getFullYear(), 6, 1)
  } else {
    // 基準日12/31 → 付与日翌年1/1
    return new Date(firstRef.getFullYear() + 1, 0, 1)
  }
}

/**
 * 基準日までの勤続期間が6ヶ月未満かチェック
 * → 6ヶ月未満の場合、6ヶ月勤続とみなす（第59条第2項ただし書き）
 */
export function getEffectiveYearsAtGrant(hireDate: Date, grantDate: Date): number {
  const actualYears = getYearsOfService(hireDate, grantDate)
  // 最初の付与で6ヶ月未満の場合、6ヶ月とみなす
  if (actualYears < 0.5) {
    return 0.5
  }
  return actualYears
}

/**
 * N回目の付与日を算出
 *
 * - 0回目 = 入社時（即日付与2日）
 * - 1回目 = 最初の基準日翌日（7/1 or 1/1）
 * - 2回目以降 = 以降毎年同じ付与日
 */
export function getNthGrantDate(hireDate: Date, n: number): Date {
  if (n === 0) return new Date(hireDate) // 入社時

  const firstGrant = getFirstGrantDate(hireDate)
  if (n === 1) return firstGrant

  // 2回目以降は毎年同じ月日
  const result = new Date(firstGrant)
  result.setFullYear(result.getFullYear() + (n - 1))
  return result
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
 * 基準日方式で有給を自動付与する（バッチジョブから毎日呼出）
 *
 * 【処理概要】
 * 1. 入社時付与: 入社日当日に2日付与
 * 2. 定期付与: 付与日（7/1 or 1/1）に該当する場合、勤続年数に応じた日数を付与
 *    - 入社〜最初の基準日が6ヶ月未満 → 6ヶ月勤続とみなす（第59条第2項ただし書き）
 */
export async function grantAnnualPaidLeave(): Promise<{
  granted: Array<{ userId: string; employeeNumber: string; days: number; reason: string }>
}> {
  const today = new Date()
  const todayMonth = today.getMonth() + 1 // 1-12
  const todayDate = today.getDate()

  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: { id: true, employeeNumber: true, hireDate: true, paidLeaveBalance: true },
  })

  const granted: Array<{ userId: string; employeeNumber: string; days: number; reason: string }> = []

  for (const user of users) {
    const hireDate = new Date(user.hireDate)
    const hireDateStr = hireDate.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]

    // ── 入社時付与チェック（入社日当日 → 2日） ──
    if (hireDateStr === todayStr) {
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
        expiresAt.setFullYear(expiresAt.getFullYear() + 2)

        await prisma.$transaction([
          prisma.paidLeaveGrant.create({
            data: {
              userId: user.id,
              grantDate: today,
              grantedDays: 2,
              expiresAt,
            },
          }),
          prisma.user.update({
            where: { id: user.id },
            data: { paidLeaveBalance: { increment: 2 } },
          }),
        ])

        granted.push({
          userId: user.id,
          employeeNumber: user.employeeNumber,
          days: 2,
          reason: '入社時付与',
        })
      }
      continue // 入社日には定期付与は行わない
    }

    // ── 定期付与チェック（付与日 = 7/1 or 1/1） ──
    const ref = getReferenceDate(hireDate)

    // 今日が付与日（7/1 or 1/1）でなければスキップ
    if (todayMonth !== ref.grantMonth || todayDate !== ref.grantDay) {
      continue
    }

    // 勤続年数を算出（みなし規定適用）
    const effectiveYears = getEffectiveYearsAtGrant(hireDate, today)
    const grantDays = getGrantDaysByTenure(effectiveYears)

    if (grantDays <= 0) continue

    // 入社時付与(2日)は別途行っているので、テーブル上 years=0 のエントリは除外
    // （入社時の2日と、最初の付与日の8日は別物）
    // 勤続6ヶ月以上（みなし含む）で初回定期付与 = 8日
    if (effectiveYears < 0.5) continue

    // 既に同日の付与があるかチェック
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
      expiresAt.setFullYear(expiresAt.getFullYear() + 2)

      await prisma.$transaction([
        prisma.paidLeaveGrant.create({
          data: {
            userId: user.id,
            grantDate: today,
            grantedDays: grantDays,
            expiresAt,
          },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { paidLeaveBalance: { increment: grantDays } },
        }),
      ])

      granted.push({
        userId: user.id,
        employeeNumber: user.employeeNumber,
        days: grantDays,
        reason: `勤続${Math.floor(effectiveYears)}年（基準日方式）`,
      })
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
