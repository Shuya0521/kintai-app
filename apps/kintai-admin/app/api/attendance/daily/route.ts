import { NextRequest } from 'next/server'
import { prisma, jsonOk, jsonError, getTodayStr } from '@kintai/shared'
import { getCurrentAdmin } from '@/lib/auth'

/** 指定月の全社員の日別勤怠データ取得（部署フィルタ対応） */
export async function GET(req: NextRequest) {
  const me = await getCurrentAdmin()
  if (!me) return jsonError('権限がありません', 403)

  const url = new URL(req.url)
  const month = url.searchParams.get('month') || getTodayStr().substring(0, 7)
  const department = url.searchParams.get('department')

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

  const attendances = await prisma.attendance.findMany({
    where: {
      userId: { in: users.map(u => u.id) },
      date: { startsWith: month },
    },
    orderBy: { date: 'asc' },
  })

  // ユーザーごとに日別データをグループ化
  const data = users.map(user => ({
    ...user,
    name: `${user.lastName} ${user.firstName}`,
    attendances: attendances.filter(a => a.userId === user.id),
  }))

  return jsonOk({ data, month })
}
