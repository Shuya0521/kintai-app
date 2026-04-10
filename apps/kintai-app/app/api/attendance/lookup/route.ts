import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, jsonOk, jsonError } from '@/lib/auth'

/** 指定日付の自分の勤怠レコードを取得 */
export async function GET(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return jsonError('認証が必要です', 401)

  const date = req.nextUrl.searchParams.get('date')
  if (!date) return jsonError('日付を指定してください', 400)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError('日付はYYYY-MM-DD形式で指定してください', 400)
  { const [dy, dm, dd] = date.split('-').map(Number); const dObj = new Date(dy, dm - 1, dd)
    if (dObj.getFullYear() !== dy || dObj.getMonth() + 1 !== dm || dObj.getDate() !== dd) return jsonError('無効な日付です', 400) }

  const attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId: me.id, date } },
    select: {
      id: true,
      date: true,
      checkInTime: true,
      checkOutTime: true,
      breakTotalMin: true,
      workPlace: true,
      note: true,
      status: true,
    },
  })

  if (!attendance) return jsonError('該当日の勤怠レコードが見つかりません', 404)

  return jsonOk({ attendance })
}
