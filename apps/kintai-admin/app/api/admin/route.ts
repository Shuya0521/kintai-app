import { prisma, getTodayStr, jsonOk, jsonError } from '@kintai/shared'
import { getCurrentAdmin } from '@/lib/auth'

export async function GET() {
  const me = await getCurrentAdmin()
  if (!me) return jsonError('権限がありません', 403)

  const today = getTodayStr()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const todayRecords = await prisma.attendance.findMany({
    where: { date: today },
    include: { user: { select: { id: true, lastName: true, firstName: true, department: true, role: true } } },
  })

  const pendingApprovals = await prisma.approval.count({
    where: { approverId: me.id, status: 'pending' },
  })

  const totalUsers = await prisma.user.count({ where: { status: 'active' } })
  const pendingUsers = await prisma.user.count({ where: { status: 'pending' } })

  const overtimeRecords = await prisma.overtimeRecord.findMany({
    where: { year, month },
  })
  const overtimeWarnings = overtimeRecords.filter(r => r.totalMin > 45 * 60).length

  const todayLeaves = await prisma.leaveRequest.count({
    where: { status: 'approved', startDate: { lte: today }, endDate: { gte: today } },
  })

  return jsonOk({
    today: {
      working: todayRecords.filter(r => r.status === 'working').length,
      breaking: todayRecords.filter(r => r.status === 'breaking').length,
      done: todayRecords.filter(r => r.status === 'done').length,
      office: todayRecords.filter(r => r.workPlace === 'office').length,
      remote: todayRecords.filter(r => r.workPlace === 'remote').length,
      onLeave: todayLeaves,
    },
    pendingApprovals,
    pendingUsers,
    totalUsers,
    overtimeWarnings,
    members: todayRecords.map(r => ({
      id: r.user.id,
      name: `${r.user.lastName} ${r.user.firstName}`,
      dept: r.user.department,
      status: r.status,
      workPlace: r.workPlace,
      checkIn: r.checkInTime,
      workMin: r.workMin,
      overtimeMin: r.overtimeMin,
    })),
  })
}
