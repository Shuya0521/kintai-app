import { NextRequest } from 'next/server'
import { prisma, jsonOk, jsonError, getTodayStr } from '@kintai/shared'
import { getCurrentAdmin } from '@/lib/auth'

/** 全社員の月次勤怠一覧 */
export async function GET(req: NextRequest) {
  const me = await getCurrentAdmin()
  if (!me) return jsonError('権限がありません', 403)

  const url = new URL(req.url)
  const month = url.searchParams.get('month') || getTodayStr().substring(0, 7)
  const department = url.searchParams.get('department')

  // 全社員取得
  const userWhere: Record<string, unknown> = { status: 'active' }
  if (department) userWhere.department = department

  const users = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true, employeeNumber: true, lastName: true, firstName: true,
      department: true, role: true,
    },
    orderBy: { employeeNumber: 'asc' },
  })

  // 全社員の勤怠データを一括取得
  const attendances = await prisma.attendance.findMany({
    where: {
      userId: { in: users.map(u => u.id) },
      date: { startsWith: month },
    },
  })

  // 休暇申請も一括取得
  const leaveRequests = await prisma.leaveRequest.findMany({
    where: {
      userId: { in: users.map(u => u.id) },
      status: 'approved',
      // Bug #7: 月をまたぐ有給も集計
      startDate: { lte: `${month}-31` },
      endDate: { gte: `${month}-01` },
    },
  })

  // 社員ごとにサマリを作成
  const summaries = users.map(user => {
    const userAttendances = attendances.filter(a => a.userId === user.id)
    const userLeaves = leaveRequests.filter(l => l.userId === user.id)

    const workDays = userAttendances.filter(a => a.status === 'done' && a.workPlace === 'office').length
    const remoteDays = userAttendances.filter(a => a.status === 'done' && a.workPlace === 'remote').length
    const totalOvertimeMin = userAttendances.reduce((s, a) => s + a.overtimeMin, 0)
    const totalLateEarlyMin = userAttendances.reduce((s, a) => s + a.lateMin + a.earlyLeaveMin, 0)
    const holidayWorkDays = userAttendances.filter(a => a.isHolidayWork).length

    const paidLeaveDays = userLeaves
      .filter(l => l.type === 'vacation' || l.type === 'half-am' || l.type === 'half-pm')
      .reduce((s, l) => s + l.days, 0)
    const specialLeaveDays = userLeaves.filter(l => l.type === 'special').length

    return {
      employeeNumber: user.employeeNumber,
      name: `${user.lastName} ${user.firstName}`,
      department: user.department,
      role: user.role,
      workDays,
      remoteDays,
      remoteAllowanceDays: remoteDays, // デフォルトは勤務日数と同じ
      paidLeaveDays,
      specialLeaveDays,
      absentDays: 0,
      lateEarlyMin: totalLateEarlyMin,
      overtimeMin: totalOvertimeMin,
      holidayWorkDays,
      totalDays: workDays + remoteDays + paidLeaveDays + specialLeaveDays,
    }
  })

  return jsonOk({ summaries, month })
}
