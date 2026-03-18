/**
 * バッチ処理スケジューラ
 *
 * node-cronを使用して以下のジョブを定期実行:
 *   - 有給年次自動付与       毎日 00:05
 *   - 有給時効処理           毎日 00:10
 *   - 打刻忘れチェック       毎日 22:00（平日）
 *   - エスカレーション       毎時
 *   - 残業月次確定           毎月1日 01:00
 *
 * kintai-admin起動時にinitScheduler()を呼び出して初期化する。
 */

import cron from 'node-cron'
import { prisma } from '../db'
import { grantAnnualPaidLeave, expirePaidLeaves } from '../services/leave.service'
import { sendMail, missedStampEmail, overtimeWarningEmail } from '../services/email.service'
import { getTodayStr } from '../formatters'
import { ROLE_HIERARCHY } from '../constants'

let initialized = false

/**
 * スケジューラ初期化（kintai-admin起動時に1回だけ呼ぶ）
 */
export function initScheduler(): void {
  if (initialized) {
    console.log('[Scheduler] Already initialized, skipping')
    return
  }
  initialized = true

  console.log('[Scheduler] Initializing batch jobs...')

  // ── 有給年次自動付与（毎日 00:05）──────────────────
  cron.schedule('5 0 * * *', async () => {
    console.log('[Batch] 有給年次自動付与 start')
    try {
      const result = await grantAnnualPaidLeave()
      if (result.granted.length > 0) {
        console.log(`[Batch] 有給付与: ${result.granted.length}名に付与完了`)
        result.granted.forEach(g => {
          console.log(`  - ${g.employeeNumber}: ${g.days}日付与`)
        })
      } else {
        console.log('[Batch] 有給付与: 本日付与対象者なし')
      }
    } catch (err) {
      console.error('[Batch] 有給付与エラー:', err)
    }
  })

  // ── 有給時効処理（毎日 00:10）──────────────────────
  cron.schedule('10 0 * * *', async () => {
    console.log('[Batch] 有給時効処理 start')
    try {
      const result = await expirePaidLeaves()
      if (result.expired.length > 0) {
        console.log(`[Batch] 有給時効: ${result.expired.length}件失効処理`)
      } else {
        console.log('[Batch] 有給時効: 失効対象なし')
      }
    } catch (err) {
      console.error('[Batch] 有給時効エラー:', err)
    }
  })

  // ── 打刻忘れチェック（毎日 22:00、平日のみ）────────
  cron.schedule('0 22 * * 1-5', async () => {
    console.log('[Batch] 打刻忘れチェック start')
    try {
      const today = getTodayStr()
      const result = await checkMissedStamps(today)
      if (result.length > 0) {
        console.log(`[Batch] 打刻忘れ検知: ${result.length}件`)
      } else {
        console.log('[Batch] 打刻忘れ: 全員正常')
      }
    } catch (err) {
      console.error('[Batch] 打刻忘れチェックエラー:', err)
    }
  })

  // ── エスカレーション（毎時）───────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await escalateOverdueApprovals()
      if (result > 0) {
        console.log(`[Batch] エスカレーション: ${result}件転送`)
      }
    } catch (err) {
      console.error('[Batch] エスカレーションエラー:', err)
    }
  })

  // ── 残業月次確定（毎月1日 01:00）──────────────────
  cron.schedule('0 1 1 * *', async () => {
    console.log('[Batch] 残業月次確定 start')
    try {
      const now = new Date()
      // getMonth()は0-indexed: 3月→2、これは前月(2月)の1-indexed値と一致
      let prevMonth = now.getMonth()
      let prevYear = now.getFullYear()
      if (prevMonth === 0) { prevMonth = 12; prevYear -= 1 }

      await finalizeMonthlyOvertime(prevYear, prevMonth)
      console.log(`[Batch] 残業月次確定: ${prevYear}年${prevMonth}月 完了`)
    } catch (err) {
      console.error('[Batch] 残業月次確定エラー:', err)
    }
  })

  console.log('[Scheduler] All batch jobs registered')
}

// ── 打刻忘れ検知 ────────────────────────────────────

async function checkMissedStamps(date: string): Promise<string[]> {
  const alerts: string[] = []

  // 土日チェック（土日はスキップ）
  const dayOfWeek = new Date(date).getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return alerts
  }

  // 祝日チェック
  const holiday = await prisma.holiday.findUnique({ where: { date } })
  if (holiday) {
    return alerts
  }

  // アクティブ社員を取得
  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: { id: true, employeeNumber: true },
  })

  // 当日の勤怠を一括取得
  const attendances = await prisma.attendance.findMany({
    where: { date, userId: { in: users.map(u => u.id) } },
  })

  const attMap = new Map(attendances.map(a => [a.userId, a]))

  for (const user of users) {
    const att = attMap.get(user.id)

    if (!att) {
      // 勤怠記録なし → 休暇チェック
      const hasLeave = await prisma.leaveRequest.findFirst({
        where: {
          userId: user.id,
          status: 'approved',
          startDate: { lte: date },
          endDate: { gte: date },
        },
      })
      if (!hasLeave) {
        await createMissedAlert(user.id, date, 'no_record')
        alerts.push(`${user.employeeNumber}: 勤怠記録なし`)
      }
      continue
    }

    // 出勤あり退勤なし
    if (att.checkInTime && !att.checkOutTime && att.status !== 'holiday') {
      await createMissedAlert(user.id, date, 'no_checkout')
      alerts.push(`${user.employeeNumber}: 退勤未打刻`)
    }

    // 休憩みなし控除方式のため、no_break_end チェックは不要
  }

  return alerts
}

async function createMissedAlert(userId: string, date: string, alertType: string) {
  // 重複チェック
  const existing = await prisma.missedStampAlert.findFirst({
    where: { userId, date, alertType },
  })
  if (!existing) {
    await prisma.missedStampAlert.create({
      data: { userId, date, alertType },
    })

    // メール通知
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user) {
      const { subject, html } = missedStampEmail({
        employeeName: `${user.lastName} ${user.firstName}`,
        date,
        alertType,
      })
      sendMail(user.email, subject, html, 'missedStamp').catch(() => {})
    }
  }
}

// ── エスカレーション ────────────────────────────────

async function escalateOverdueApprovals(): Promise<number> {
  const now = new Date()

  // 72時間以上未処理の承認を取得
  const overdueApprovals = await prisma.approval.findMany({
    where: {
      status: 'pending',
      dueAt: { lt: now },
    },
    include: {
      approver: { select: { id: true, department: true, role: true } },
    },
  })

  let escalatedCount = 0

  for (const approval of overdueApprovals) {
    // 上位承認者を検索（同部署でより上位のロール）
    const currentRoleIdx = ROLE_HIERARCHY.indexOf(approval.approver.role as typeof ROLE_HIERARCHY[number])

    if (currentRoleIdx < 0 || currentRoleIdx >= ROLE_HIERARCHY.length - 1) continue

    // 上位ロールの承認者を検索
    const upperRoles = ROLE_HIERARCHY.slice(currentRoleIdx + 1) as unknown as string[]
    const upperApprover = await prisma.user.findFirst({
      where: {
        department: approval.approver.department,
        role: { in: upperRoles },
        status: 'active',
      },
      orderBy: { role: 'asc' }, // 最も近い上位から
    })

    if (upperApprover) {
      await prisma.approval.update({
        where: { id: approval.id },
        data: {
          approverId: upperApprover.id,
          escalatedFrom: approval.approverId,
          escalatedAt: now,
          status: 'escalated',
          dueAt: new Date(now.getTime() + 72 * 60 * 60 * 1000), // 新しい期限
        },
      })
      escalatedCount++
    }
  }

  return escalatedCount
}

// ── 残業月次確定 ────────────────────────────────────

async function finalizeMonthlyOvertime(year: number, month: number): Promise<void> {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`

  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: { id: true },
  })

  for (const user of users) {
    const attendances = await prisma.attendance.findMany({
      where: {
        userId: user.id,
        date: { startsWith: monthStr },
        status: 'done',
      },
      select: { overtimeMin: true },
    })

    const totalMin = attendances.reduce((sum, a) => sum + a.overtimeMin, 0)

    await prisma.overtimeRecord.upsert({
      where: { userId_year_month: { userId: user.id, year, month } },
      create: {
        userId: user.id,
        year,
        month,
        totalMin,
        warningTriggered: totalMin >= 45 * 60,
        limitExceeded: totalMin >= 80 * 60,
      },
      update: {
        totalMin,
        warningTriggered: totalMin >= 45 * 60,
        limitExceeded: totalMin >= 80 * 60,
      },
    })

    // 残業警告メール送信
    const totalHours = Math.round(totalMin / 60)
    let level = ''
    if (totalMin >= 100 * 60) level = 'violation'
    else if (totalMin >= 80 * 60) level = 'critical'
    else if (totalMin >= 60 * 60) level = 'serious'
    else if (totalMin >= 45 * 60) level = 'warning'
    else if (totalMin >= 36 * 60) level = 'caution'

    if (level) {
      const emp = await prisma.user.findUnique({ where: { id: user.id } })
      if (emp) {
        const monthStr = `${year}年${month}月`
        const { subject, html } = overtimeWarningEmail({
          employeeName: `${emp.lastName} ${emp.firstName}`,
          month: monthStr,
          totalHours,
          level,
        })
        sendMail(emp.email, subject, html, 'overtimeWarning').catch(() => {})
      }
    }
  }
}
