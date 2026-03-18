import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { prisma, jsonError, isExportRole, verifyToken } from '@kintai/shared'

/** CSV勤怠データダウンロード */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('kintai_token')?.value
  if (!token) return jsonError('認証が必要です', 401)
  const payload = verifyToken(token)
  if (!payload) return jsonError('認証が必要です', 401)
  const me = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, status: true },
  })
  if (!me || me.status !== 'active') return jsonError('権限がありません', 403)
  if (!isExportRole(me.role)) return jsonError('CSV出力の権限がありません（部長以上）', 403)

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
        startDate: { startsWith: monthStr },
      },
    }),
  ])

  // CSV ヘッダー
  const header = [
    '社員番号', '氏名', '部署', '日付', '曜日',
    '出勤時刻', '退勤時刻', '勤務場所',
    '実働(分)', '残業(分)', '遅刻(分)', '早退(分)',
    '休憩(分)', '休日出勤', 'ステータス', '備考',
  ]

  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  const daysInMonth = new Date(year, month, 0).getDate()

  const rows: string[][] = []

  for (const user of users) {
    const userAtt = attendances.filter(a => a.userId === user.id)

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayOfWeek = weekdays[new Date(year, month - 1, d).getDay()]
      const att = userAtt.find(a => a.date === dateStr)

      const formatTime = (dt: Date | null): string => {
        if (!dt) return ''
        const date = new Date(dt)
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      }

      const leaveForDay = leaveRequests.find(l =>
        l.userId === user.id && l.startDate <= dateStr && l.endDate >= dateStr
      )
      const statusLabel = att?.status === 'done' ? '退勤済'
        : att?.status === 'working' ? '勤務中'
        : leaveForDay ? (leaveForDay.type === 'vacation' ? '有給' : leaveForDay.type === 'half-am' ? '午前半休' : leaveForDay.type === 'half-pm' ? '午後半休' : '特別休暇')
        : ''

      rows.push([
        user.employeeNumber,
        `${user.lastName} ${user.firstName}`,
        user.department,
        dateStr,
        dayOfWeek,
        att ? formatTime(att.checkInTime) : '',
        att ? formatTime(att.checkOutTime) : '',
        att ? (att.workPlace === 'remote' ? '在宅' : '出社') : '',
        att ? String(att.workMin) : '',
        att ? String(att.overtimeMin) : '',
        att ? String(att.lateMin) : '',
        att ? String(att.earlyLeaveMin) : '',
        att ? String(att.breakTotalMin) : '',
        att?.isHolidayWork ? '○' : '',
        statusLabel,
        att?.note || '',
      ])
    }
  }

  // BOM + CSV生成
  const bom = '\uFEFF'
  const csvContent = bom + [
    header.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  const fileName = `勤怠データ_${year}年${String(month).padStart(2, '0')}月.csv`
  const encodedFileName = encodeURIComponent(fileName)

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedFileName}`,
    },
  })
}
