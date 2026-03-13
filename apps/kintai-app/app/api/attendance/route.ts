import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, jsonOk, jsonError } from '@/lib/auth'
import { STANDARD_WORK_MIN, getTodayStr } from '@kintai/shared'

export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return jsonError('認証が必要です', 401)

  try {
    const { action, workPlace } = await req.json()
    const today = getTodayStr()
    const now = new Date()

    let record = await prisma.attendance.findUnique({
      where: { userId_date: { userId: me.id, date: today } },
    })

    if (action === 'in') {
      if (record && record.checkInTime) return jsonError('既に出勤済みです', 400)
      record = await prisma.attendance.upsert({
        where: { userId_date: { userId: me.id, date: today } },
        create: {
          userId: me.id,
          date: today,
          checkInTime: now,
          workPlace: workPlace || 'office',
          status: 'working',
        },
        update: {
          checkInTime: now,
          workPlace: workPlace || 'office',
          status: 'working',
        },
      })
    } else if (action === 'out') {
      if (!record || !record.checkInTime) return jsonError('出勤記録がありません', 400)
      if (record.checkOutTime) return jsonError('既に退勤済みです', 400)

      const inTime = record.checkInTime!.getTime()
      const workMin = Math.floor((now.getTime() - inTime) / 60000) - record.breakTotalMin
      const overtimeMin = Math.max(0, workMin - STANDARD_WORK_MIN)
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      // トランザクションで勤怠更新 + 残業記録を原子的に処理
      record = await prisma.$transaction(async (tx) => {
        const updated = await tx.attendance.update({
          where: { id: record!.id },
          data: { checkOutTime: now, workMin, overtimeMin, status: 'done' },
        })

        if (overtimeMin > 0) {
          await tx.overtimeRecord.upsert({
            where: { userId_year_month: { userId: me.id, year, month } },
            create: { userId: me.id, year, month, totalMin: overtimeMin },
            update: { totalMin: { increment: overtimeMin } },
          })
        }

        return updated
      })

    } else if (action === 'break-start') {
      if (!record || record.status !== 'working') return jsonError('勤務中ではありません', 400)
      record = await prisma.attendance.update({
        where: { id: record.id },
        data: { breakStartTime: now, status: 'breaking' },
      })
    } else if (action === 'break-end') {
      if (!record || record.status !== 'breaking') return jsonError('休憩中ではありません', 400)
      const breakMin = Math.floor((now.getTime() - record.breakStartTime!.getTime()) / 60000)
      record = await prisma.attendance.update({
        where: { id: record.id },
        data: {
          breakStartTime: null,
          breakTotalMin: record.breakTotalMin + breakMin,
          status: 'working',
        },
      })
    } else {
      return jsonError('無効なアクションです', 400)
    }

    return jsonOk({ attendance: record })
  } catch (error) {
    console.error('Stamp error:', error)
    return jsonError('打刻に失敗しました', 500)
  }
}

export async function GET(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return jsonError('認証が必要です', 401)

  const url = new URL(req.url)
  const range = url.searchParams.get('range') || 'today'

  if (range === 'today') {
    const today = getTodayStr()
    const [record, checkedInCount, totalCount] = await Promise.all([
      prisma.attendance.findUnique({
        where: { userId_date: { userId: me.id, date: today } },
      }),
      prisma.attendance.count({
        where: { date: today, status: { in: ['working', 'breaking', 'done'] } },
      }),
      prisma.user.count({ where: { status: 'active' } }),
    ])
    return jsonOk({
      attendance: record,
      socialProof: { checkedIn: checkedInCount, total: totalCount },
    })
  }

  if (range === 'daily') {
    const month = url.searchParams.get('month') || getTodayStr().substring(0, 7)
    const records = await prisma.attendance.findMany({
      where: { userId: me.id, date: { startsWith: month } },
      orderBy: { date: 'desc' },
    })
    return jsonOk({ records })
  }

  if (range === 'monthly') {
    const month = url.searchParams.get('month') || getTodayStr().substring(0, 7)
    const [records, paidLeaveRequests] = await Promise.all([
      prisma.attendance.findMany({
        where: { userId: me.id, date: { startsWith: month } },
      }),
      prisma.leaveRequest.findMany({
        where: {
          userId: me.id,
          status: 'approved',
          type: { in: ['vacation', 'half-am', 'half-pm'] },
        },
      }),
    ])

    const totalWorkMin = records.reduce((s, r) => s + r.workMin, 0)
    const totalOvertimeMin = records.reduce((s, r) => s + r.overtimeMin, 0)
    const workDays = records.filter(r => r.status === 'done').length
    const paidLeaveTaken = paidLeaveRequests.reduce((s, l) => s + l.days, 0)

    return jsonOk({
      summary: {
        workDays,
        totalWorkHours: Math.floor(totalWorkMin / 60),
        totalWorkMin: totalWorkMin % 60,
        totalOvertimeHours: Math.floor(totalOvertimeMin / 60),
        totalOvertimeMin: totalOvertimeMin % 60,
        paidLeaveBalance: me.paidLeaveBalance,
        paidLeaveTaken,
      },
      records,
    })
  }

  return jsonError('無効なrangeパラメータです', 400)
}
