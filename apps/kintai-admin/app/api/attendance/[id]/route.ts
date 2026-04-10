import { NextRequest } from 'next/server'
import { prisma, isApproverRole, jsonOk, jsonError, recalculateAttendanceMinutes, createAuditLog, getClientIp } from '@kintai/shared'
import { getCurrentAdmin } from '@/lib/auth'

/** 勤怠レコード詳細取得 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentAdmin()
  if (!me) return jsonError('権限がありません', 403)

  const { id } = await params

  const attendance = await prisma.attendance.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, employeeNumber: true, lastName: true, firstName: true, department: true, role: true },
      },
    },
  })

  if (!attendance) return jsonError('勤怠レコードが見つかりません', 404)

  return jsonOk({ attendance })
}

/** 管理者による勤怠直接修正 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentAdmin()
  if (!me || !isApproverRole(me.role)) return jsonError('承認権限がありません', 403)

  const { id } = await params

  try {
    const body = await req.json()
    const { checkInTime, checkOutTime, breakTotalMin, workPlace, note, reason } = body

    if (!reason) return jsonError('修正理由を入力してください', 400)

    // 現在のレコードを取得（変更前の値を記録）
    const current = await prisma.attendance.findUnique({ where: { id } })
    if (!current) return jsonError('勤怠レコードが見つかりません', 404)

    // 更新データを構築
    const updateData: Record<string, unknown> = {}

    // Bug #6: TZ未指定の日時文字列にJSTオフセットを付与
    const toJSTDate = (s: string) => {
      if (!s) return null
      return s.includes('Z') || s.includes('+') || s.includes('T') && s.match(/[+-]\d{2}:\d{2}$/)
        ? new Date(s)
        : new Date(s + '+09:00')
    }
    if (checkInTime !== undefined) updateData.checkInTime = checkInTime ? toJSTDate(checkInTime) : null
    if (checkOutTime !== undefined) updateData.checkOutTime = checkOutTime ? toJSTDate(checkOutTime) : null
    if (breakTotalMin !== undefined) updateData.breakTotalMin = breakTotalMin
    if (workPlace !== undefined) updateData.workPlace = workPlace
    if (note !== undefined) updateData.note = note

    // 労働時間を再計算
    const newCheckIn = checkInTime !== undefined ? (checkInTime ? toJSTDate(checkInTime) : null) : current.checkInTime
    const newCheckOut = checkOutTime !== undefined ? (checkOutTime ? toJSTDate(checkOutTime) : null) : current.checkOutTime
    const newBreak = breakTotalMin !== undefined ? breakTotalMin : current.breakTotalMin

    const calc = recalculateAttendanceMinutes({
      checkInTime: newCheckIn,
      checkOutTime: newCheckOut,
      breakTotalMin: newBreak,
      isHolidayWork: current.isHolidayWork,
    })

    updateData.workMin = calc.workMin
    updateData.overtimeMin = calc.overtimeMin
    updateData.lateMin = calc.lateMin
    updateData.earlyLeaveMin = calc.earlyLeaveMin

    // 退勤済みなら status を done に
    if (newCheckIn && newCheckOut) {
      updateData.status = 'done'
    }

    // 更新実行（トランザクションでAttendance + OvertimeRecord を原子的に処理）
    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.attendance.update({
        where: { id },
        data: updateData,
      })

      // OvertimeRecord 同期更新
      if (current.date) {
        const [yr, mo] = current.date.split('-').slice(0, 2).map(Number)
        const oldOt = current.overtimeMin || 0
        const newOt = calc.overtimeMin
        const diff = newOt - oldOt
        if (diff !== 0) {
          const existing = await tx.overtimeRecord.findUnique({
            where: { userId_year_month: { userId: current.userId, year: yr, month: mo } },
          })
          const safeTotalMin = Math.max(0, (existing?.totalMin ?? 0) + diff)
          await tx.overtimeRecord.upsert({
            where: { userId_year_month: { userId: current.userId, year: yr, month: mo } },
            create: { userId: current.userId, year: yr, month: mo, totalMin: Math.max(0, newOt) },
            update: { totalMin: safeTotalMin },
          })
        }
      }

      return upd
    })

    // 監査ログ記録
    await createAuditLog({
      userId: me.id,
      action: 'update',
      targetType: 'attendance',
      targetId: id,
      details: {
        type: 'admin_direct_correction',
        reason,
        before: {
          checkInTime: current.checkInTime?.toISOString() || null,
          checkOutTime: current.checkOutTime?.toISOString() || null,
          breakTotalMin: current.breakTotalMin,
          workMin: current.workMin,
          overtimeMin: current.overtimeMin,
          workPlace: current.workPlace,
          note: current.note,
        },
        after: {
          checkInTime: newCheckIn?.toISOString() || null,
          checkOutTime: newCheckOut?.toISOString() || null,
          breakTotalMin: newBreak,
          workMin: calc.workMin,
          overtimeMin: calc.overtimeMin,
          workPlace: workPlace !== undefined ? workPlace : current.workPlace,
          note: note !== undefined ? note : current.note,
        },
      },
      ipAddress: getClientIp(req),
    })


    return jsonOk({ attendance: updated, message: '勤怠を修正しました' })
  } catch (error) {
    console.error('Attendance correction error:', error)
    return jsonError('勤怠修正に失敗しました', 500)
  }
}
