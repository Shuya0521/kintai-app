/**
 * 残業管理サービス — 36協定チェックエンジン
 *
 * 労働基準法に基づく残業時間の管理:
 *   - 月45時間 / 年360時間（原則上限）
 *   - 月100時間未満（絶対的上限、休日労働含む）
 *   - 2〜6ヶ月平均80時間以内（全パターンチェック）
 *   - 特別条項は年6回まで
 *
 * 休憩時間の法定チェック:
 *   - 6時間超: 最低45分
 *   - 8時間超: 最低60分
 */

import { prisma } from '../db'

// ── 警告レベル ──────────────────────────────────────

export type OvertimeWarningLevel =
  | 'ok'           // 問題なし
  | 'caution'      // 注意（36h超過）
  | 'warning'      // 警告（45h超過 — 原則上限）
  | 'serious'      // 重大（60h超過）
  | 'critical'     // 違反（80h超過 — 産業医面談対象）
  | 'violation'    // 法令違反（100h以上 — 絶対的上限超過）

export interface OvertimeCheckResult {
  userId: string
  year: number
  month: number
  monthlyMin: number          // 当月の残業分数
  monthlyHours: number        // 当月の残業時間（小数）
  warningLevel: OvertimeWarningLevel
  alerts: OvertimeAlert[]
  isViolation: boolean
}

export interface OvertimeAlert {
  type: 'monthly_limit' | 'yearly_limit' | 'rolling_average' | 'special_clause'
  level: OvertimeWarningLevel
  message: string
  detail: string
}

// ── 閾値定数 ────────────────────────────────────────

const THRESHOLDS = {
  CAUTION_MONTHLY_MIN: 36 * 60,      // 36h → 注意
  WARNING_MONTHLY_MIN: 45 * 60,      // 45h → 警告（原則上限）
  SERIOUS_MONTHLY_MIN: 60 * 60,      // 60h → 重大
  CRITICAL_MONTHLY_MIN: 80 * 60,     // 80h → 違反（産業医面談）
  VIOLATION_MONTHLY_MIN: 100 * 60,   // 100h → 法令違反（絶対的上限）
  YEARLY_LIMIT_MIN: 360 * 60,        // 年360h
  ROLLING_AVG_LIMIT_MIN: 80 * 60,    // 2〜6ヶ月平均80h
  SPECIAL_CLAUSE_MAX_MONTHS: 6,      // 特別条項は年6回まで
} as const

// ── メイン関数 ──────────────────────────────────────

/**
 * 月次の36協定チェック
 */
export async function checkMonthlyOvertime(
  userId: string,
  year: number,
  month: number
): Promise<OvertimeCheckResult> {
  const alerts: OvertimeAlert[] = []

  // 当月の残業分数を集計
  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const attendances = await prisma.attendance.findMany({
    where: {
      userId,
      date: { startsWith: monthStr },
      status: 'done',
    },
    select: { overtimeMin: true, isHolidayWork: true, workMin: true },
  })

  const monthlyMin = attendances.reduce((sum, a) => sum + a.overtimeMin, 0)
  const monthlyHours = Math.round(monthlyMin / 60 * 10) / 10

  // ① 月次チェック
  const warningLevel = getOvertimeWarningLevel(monthlyMin)
  if (warningLevel !== 'ok') {
    alerts.push({
      type: 'monthly_limit',
      level: warningLevel,
      message: getWarningMessage(warningLevel, monthlyHours),
      detail: `当月残業時間: ${monthlyHours}時間`,
    })
  }

  // ② 年間チェック（年360時間）
  const yearlyResult = await checkYearlyOvertime(userId, year, month)
  if (yearlyResult.alert) {
    alerts.push(yearlyResult.alert)
  }

  // ③ 2〜6ヶ月移動平均チェック（80時間）
  const rollingAlerts = await checkRollingAverageOvertime(userId, year, month)
  alerts.push(...rollingAlerts)

  // ④ 特別条項チェック（年6回まで）
  const specialAlert = await checkSpecialClause(userId, year, month)
  if (specialAlert) {
    alerts.push(specialAlert)
  }

  return {
    userId,
    year,
    month,
    monthlyMin,
    monthlyHours,
    warningLevel,
    alerts,
    isViolation: warningLevel === 'violation' || warningLevel === 'critical' ||
      alerts.some(a => a.level === 'violation' || a.level === 'critical'),
  }
}

/**
 * 残業時間から警告レベルを判定
 */
export function getOvertimeWarningLevel(totalMin: number): OvertimeWarningLevel {
  if (totalMin >= THRESHOLDS.VIOLATION_MONTHLY_MIN) return 'violation'
  if (totalMin >= THRESHOLDS.CRITICAL_MONTHLY_MIN) return 'critical'
  if (totalMin >= THRESHOLDS.SERIOUS_MONTHLY_MIN) return 'serious'
  if (totalMin >= THRESHOLDS.WARNING_MONTHLY_MIN) return 'warning'
  if (totalMin >= THRESHOLDS.CAUTION_MONTHLY_MIN) return 'caution'
  return 'ok'
}

function getWarningMessage(level: OvertimeWarningLevel, hours: number): string {
  switch (level) {
    case 'violation':
      return `【法令違反】月100時間以上の残業（${hours}h）。絶対的上限を超過しています。`
    case 'critical':
      return `【産業医面談対象】月80時間超の残業（${hours}h）。産業医面談の案内が必要です。`
    case 'serious':
      return `【重大警告】月60時間超の残業（${hours}h）。早急な是正が必要です。`
    case 'warning':
      return `【警告】月45時間超の残業（${hours}h）。36協定の原則上限を超過しています。`
    case 'caution':
      return `【注意】月36時間超の残業（${hours}h）。上限に近づいています。`
    default:
      return ''
  }
}

// ── 年間チェック ────────────────────────────────────

async function checkYearlyOvertime(
  userId: string,
  year: number,
  currentMonth: number
): Promise<{ totalMin: number; alert?: OvertimeAlert }> {
  // 1月〜当月までの残業を集計
  let totalYearlyMin = 0

  for (let m = 1; m <= currentMonth; m++) {
    const mStr = `${year}-${String(m).padStart(2, '0')}`
    const records = await prisma.attendance.findMany({
      where: { userId, date: { startsWith: mStr }, status: 'done' },
      select: { overtimeMin: true },
    })
    totalYearlyMin += records.reduce((sum, r) => sum + r.overtimeMin, 0)
  }

  const totalHours = Math.round(totalYearlyMin / 60 * 10) / 10

  if (totalYearlyMin >= THRESHOLDS.YEARLY_LIMIT_MIN) {
    return {
      totalMin: totalYearlyMin,
      alert: {
        type: 'yearly_limit',
        level: 'warning',
        message: `年間残業時間が360時間上限を超過しています（${totalHours}h）`,
        detail: `${year}年1月〜${currentMonth}月の累計: ${totalHours}時間`,
      },
    }
  }

  // 年度末までの見込みチェック
  const remainingMonths = 12 - currentMonth
  if (remainingMonths > 0) {
    const avgPerMonth = totalYearlyMin / currentMonth
    const projectedTotal = totalYearlyMin + avgPerMonth * remainingMonths
    if (projectedTotal >= THRESHOLDS.YEARLY_LIMIT_MIN) {
      return {
        totalMin: totalYearlyMin,
        alert: {
          type: 'yearly_limit',
          level: 'caution',
          message: `現在のペースで年間360時間上限を超過する見込みです（見込${Math.round(projectedTotal / 60)}h）`,
          detail: `${year}年1月〜${currentMonth}月の累計: ${totalHours}時間`,
        },
      }
    }
  }

  return { totalMin: totalYearlyMin }
}

// ── 2〜6ヶ月移動平均チェック ────────────────────────

async function checkRollingAverageOvertime(
  userId: string,
  year: number,
  month: number
): Promise<OvertimeAlert[]> {
  const alerts: OvertimeAlert[] = []

  // 過去6ヶ月分のデータを取得
  const monthlyMins: number[] = []
  for (let i = 0; i < 6; i++) {
    let m = month - i
    let y = year
    if (m <= 0) { m += 12; y -= 1 }

    const mStr = `${y}-${String(m).padStart(2, '0')}`
    const records = await prisma.attendance.findMany({
      where: { userId, date: { startsWith: mStr }, status: 'done' },
      select: { overtimeMin: true },
    })
    monthlyMins.push(records.reduce((sum, r) => sum + r.overtimeMin, 0))
  }

  // 2ヶ月平均、3ヶ月平均、...、6ヶ月平均の全パターンチェック
  for (let span = 2; span <= 6; span++) {
    if (monthlyMins.length < span) break

    const slice = monthlyMins.slice(0, span)
    const avgMin = slice.reduce((a, b) => a + b, 0) / span
    const avgHours = Math.round(avgMin / 60 * 10) / 10

    if (avgMin >= THRESHOLDS.ROLLING_AVG_LIMIT_MIN) {
      alerts.push({
        type: 'rolling_average',
        level: 'critical',
        message: `直近${span}ヶ月平均残業が80時間を超過（平均${avgHours}h）`,
        detail: `直近${span}ヶ月の月別: ${slice.map(m => Math.round(m / 60) + 'h').join(', ')}`,
      })
      break // 最短期間の違反のみ報告
    }
  }

  return alerts
}

// ── 特別条項チェック ────────────────────────────────

async function checkSpecialClause(
  userId: string,
  year: number,
  currentMonth: number
): Promise<OvertimeAlert | null> {
  // 年間で45h超の月が何回あるかカウント
  let exceededMonths = 0

  for (let m = 1; m <= currentMonth; m++) {
    const mStr = `${year}-${String(m).padStart(2, '0')}`
    const records = await prisma.attendance.findMany({
      where: { userId, date: { startsWith: mStr }, status: 'done' },
      select: { overtimeMin: true },
    })
    const total = records.reduce((sum, r) => sum + r.overtimeMin, 0)
    if (total >= THRESHOLDS.WARNING_MONTHLY_MIN) {
      exceededMonths++
    }
  }

  if (exceededMonths >= THRESHOLDS.SPECIAL_CLAUSE_MAX_MONTHS) {
    return {
      type: 'special_clause',
      level: 'violation',
      message: `特別条項の年6回上限に達しました（${exceededMonths}回/年）`,
      detail: `${year}年中に月45時間超の残業が${exceededMonths}回発生`,
    }
  }

  if (exceededMonths >= 4) {
    return {
      type: 'special_clause',
      level: 'warning',
      message: `特別条項の利用回数が${exceededMonths}回/年6回。残り${6 - exceededMonths}回です。`,
      detail: `${year}年中に月45時間超の残業が${exceededMonths}回発生`,
    }
  }

  return null
}

// ── 休憩時間の法定チェック ──────────────────────────

export interface BreakTimeCheckResult {
  isCompliant: boolean
  requiredMin: number
  actualMin: number
  message?: string
}

/**
 * 休憩時間の法定チェック（労基法34条）
 *
 * @param workMin 実労働時間（分）
 * @param breakMin 実休憩時間（分）
 */
export function checkBreakTimeCompliance(
  workMin: number,
  breakMin: number
): BreakTimeCheckResult {
  let requiredMin = 0

  if (workMin > 8 * 60) {
    requiredMin = 60
  } else if (workMin > 6 * 60) {
    requiredMin = 45
  }

  const isCompliant = breakMin >= requiredMin

  return {
    isCompliant,
    requiredMin,
    actualMin: breakMin,
    message: isCompliant
      ? undefined
      : `休憩時間が不足しています（必要: ${requiredMin}分、実際: ${breakMin}分）`,
  }
}

// ── 全社員の残業サマリ（ダッシュボード用） ──────────

export interface OvertimeSummary {
  userId: string
  employeeNumber: string
  name: string
  department: string
  monthlyMin: number
  monthlyHours: number
  warningLevel: OvertimeWarningLevel
  hasAlerts: boolean
}

/**
 * 全社員の当月残業サマリを取得
 */
export async function getAllEmployeesOvertimeSummary(
  year: number,
  month: number
): Promise<OvertimeSummary[]> {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`

  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: {
      id: true,
      employeeNumber: true,
      lastName: true,
      firstName: true,
      department: true,
    },
    orderBy: { employeeNumber: 'asc' },
  })

  const attendances = await prisma.attendance.findMany({
    where: {
      userId: { in: users.map(u => u.id) },
      date: { startsWith: monthStr },
      status: 'done',
    },
    select: { userId: true, overtimeMin: true },
  })

  return users.map(user => {
    const userAtt = attendances.filter(a => a.userId === user.id)
    const monthlyMin = userAtt.reduce((sum, a) => sum + a.overtimeMin, 0)
    const monthlyHours = Math.round(monthlyMin / 60 * 10) / 10
    const warningLevel = getOvertimeWarningLevel(monthlyMin)

    return {
      userId: user.id,
      employeeNumber: user.employeeNumber,
      name: `${user.lastName} ${user.firstName}`,
      department: user.department,
      monthlyMin,
      monthlyHours,
      warningLevel,
      hasAlerts: warningLevel !== 'ok',
    }
  })
}
