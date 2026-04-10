import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { prisma, jsonError, isExportRole, verifyToken } from '@kintai/shared'
import {
  generateAttendanceExcel,
  type EmployeeExportData,
  type DailyExportRecord,
} from '@kintai/shared/src/excel/generator'

/** Excel勤怠一覧表ダウンロード */
export async function POST(req: NextRequest) {
  // Excel出力は部長以上（ADMIN_ROLESとは別にEXPORT_ROLESで制御）
  const cookieStore = await cookies()
  const token = cookieStore.get('kintai_token')?.value
  if (!token) return jsonError('認証が必要です', 401)
  const payload = verifyToken(token)
  if (!payload) return jsonError('認証が必要です', 401)
  const me = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, department: true, status: true },
  })
  if (!me || me.status !== 'active') return jsonError('権限がありません', 403)
  if (!isExportRole(me.role)) return jsonError('Excel出力の権限がありません（部長以上）', 403)

  let body: { year?: number; month?: number; department?: string }
  try {
    body = await req.json()
  } catch {
    return jsonError('不正なリクエストです', 400)
  }

  const now = new Date()
  const year = body.year ?? now.getFullYear()
  const month = body.month ?? now.getMonth() + 1
  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const department = body.department

  // ── 3並列クエリ ──────────────────────────────────
  const userWhere: Record<string, unknown> = { status: 'active' }
  if (department) userWhere.department = department

  const [users, attendances, leaveRequests] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        employeeNumber: true,
        lastName: true,
        firstName: true,
        department: true,
      },
      orderBy: { employeeNumber: 'asc' },
    }),
    prisma.attendance.findMany({
      where: {
        user: userWhere,
        date: { startsWith: monthStr },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        user: userWhere,
        status: 'approved',
        startDate: { lte: `${monthStr}-31` },
        endDate: { gte: `${monthStr}-01` },
      },
    }),
  ])

  // ── 当月の日数 ────────────────────────────────────
  const daysInMonth = new Date(year, month, 0).getDate()

  // ── 社員ごとにExcelデータ構築 ─────────────────────
  const employees: EmployeeExportData[] = users.map(user => {
    const userAtt = attendances.filter(a => a.userId === user.id)
    const userLeaves = leaveRequests.filter(l => l.userId === user.id)

    // 月次集計
    const workDays = userAtt.filter(a => a.status === 'done' && a.workPlace === 'office').length
    const remoteDays = userAtt.filter(a => a.status === 'done' && a.workPlace === 'remote').length
    const paidLeaveDays = userLeaves
      .filter(l => l.type === 'vacation' || l.type === 'half-am' || l.type === 'half-pm')
      .reduce((s, l) => s + l.days, 0)
    const specialLeaveDays = userLeaves.filter(l => l.type === 'special').length
    const absentDays = 0 // TODO: 欠勤判定ロジック
    const totalLateEarlyMin = userAtt.reduce((s, a) => s + a.lateMin + a.earlyLeaveMin, 0)
    const holidayWorkDays = userAtt.filter(a => a.isHolidayWork).length
    const totalDays = workDays + remoteDays + paidLeaveDays + specialLeaveDays
    const remoteAllowanceDays = remoteDays // デフォルトは在宅勤務日数と同じ
    const transportDays = workDays // 出社日 = 交通費日数

    // 遅早時間をHH:MM形式に変換
    const lateEarlyHH = Math.floor(totalLateEarlyMin / 60)
    const lateEarlyMM = totalLateEarlyMin % 60
    const lateEarlyTime = `${lateEarlyHH}:${String(lateEarlyMM).padStart(2, '0')}`

    // 日別データ構築
    // 休暇を日付→タイプのMapに変換
    const leaveMap = new Map<string, string>()
    for (const lr of userLeaves) {
      // startDate〜endDateの各日にマッピング
      const start = new Date(lr.startDate)
      const end = new Date(lr.endDate)
      const current = new Date(start)
      while (current <= end) {
        const dayStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
        leaveMap.set(dayStr, lr.type)
        current.setDate(current.getDate() + 1)
      }
    }

    const dailyRecords: DailyExportRecord[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const att = userAtt.find(a => a.date === dateStr)
      const leaveType = leaveMap.get(dateStr)

      // 出退勤時間をHH:MM形式に（JST変換: UTC+9）
      const formatTime = (dt: Date | null): string | null => {
        if (!dt) return null
        const date = new Date(dt)
        const jstH = (date.getUTCHours() + 9) % 24
        const jstM = date.getUTCMinutes()
        return `${jstH}:${String(jstM).padStart(2, '0')}`
      }

      // 勤務時間をHH:MM形式に
      const formatMinutes = (min: number): string | null => {
        if (min <= 0) return null
        return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
      }

      const lateEarly = att ? att.lateMin + att.earlyLeaveMin : 0
      const lateEarlyStr = lateEarly > 0
        ? `${Math.floor(lateEarly / 60)}:${String(lateEarly % 60).padStart(2, '0')}`
        : ''

      dailyRecords.push({
        day: d,
        checkInTime: att ? formatTime(att.checkInTime) : null,
        checkOutTime: att ? formatTime(att.checkOutTime) : null,
        workTime: att ? formatMinutes(att.workMin) : null,
        isWork: att && att.status === 'done' ? 1 : 0,
        isSpecialLeave: leaveType === 'special' ? 1 : 0,
        isPaidLeave: leaveType === 'half-am' || leaveType === 'half-pm' ? 0.5
          : leaveType === 'vacation' ? 1 : 0,
        isAbsent: 0,
        lateEarlyTime: lateEarlyStr,
        transportDays: att && att.status === 'done' && att.workPlace === 'office' ? 1 : 0,
        remoteDays: att && att.status === 'done' && att.workPlace === 'remote' ? 1 : 0,
        remoteAllowanceDays: att && att.status === 'done' && att.workPlace === 'remote' ? 1 : 0,
      })
    }

    return {
      employeeNumber: user.employeeNumber,
      name: `${user.lastName} ${user.firstName}`,
      workDays,
      specialLeaveDays,
      paidLeaveDays,
      absentDays,
      lateEarlyTime,
      transportDays,
      remoteDays,
      remoteAllowanceDays,
      holidayWorkDays,
      totalDays,
      dailyRecords,
    }
  })

  // ── 設定から会社名を取得 ──────────────────────────
  const companySetting = await prisma.setting.findUnique({ where: { key: 'companyName' } })
  const companyName = companySetting?.value
    ? JSON.parse(companySetting.value)
    : '株式会社サン・カミヤ'

  // ── 所定労働日数を取得（設定またはデフォルト） ──────
  const workingDaysSetting = await prisma.setting.findUnique({ where: { key: 'workingDays' } })
  const workingDays = workingDaysSetting?.value
    ? JSON.parse(workingDaysSetting.value)
    : daysInMonth // デフォルトは当月日数

  // ── Excel生成 ─────────────────────────────────────
  const buffer = await generateAttendanceExcel({
    year,
    month,
    companyName,
    workingDays,
    employees,
  })

  // ── レスポンス ─────────────────────────────────────
  const fileName = `勤怠一覧表_${year}年${String(month).padStart(2, '0')}月.xlsx`
  const encodedFileName = encodeURIComponent(fileName)

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedFileName}`,
      'Content-Length': String(buffer.length),
    },
  })
}
