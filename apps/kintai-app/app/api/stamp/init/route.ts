import { getCurrentUser, jsonOk, jsonError } from '@/lib/auth'
import { prisma } from '@kintai/shared'
import { getTodayStr } from '@kintai/shared'

/** 打刻画面の初期化データを1リクエストで返す統合API */
export async function GET() {
  const me = await getCurrentUser()
  if (!me) return jsonError('認証が必要です', 401)

  const today = getTodayStr()
  const [record, checkedInCount, totalCount] = await Promise.all([
    prisma.attendance.findUnique({
      where: { userId_date: { userId: me.id, date: today } },
    }),
    prisma.attendance.count({
      where: { date: today, status: { in: ['working', 'done'] } },
    }),
    prisma.user.count({ where: { status: 'active' } }),
  ])

  return jsonOk({
    user: {
      id: me.id,
      email: me.email,
      name: `${me.lastName} ${me.firstName}`,
      lastName: me.lastName,
      firstName: me.firstName,
      role: me.role,
      department: me.department,
      workType: me.workType,
      paidLeaveBalance: me.paidLeaveBalance,
      av: me.lastName.charAt(0),
    },
    attendance: record,
    socialProof: { checkedIn: checkedInCount, total: totalCount },
  })
}
