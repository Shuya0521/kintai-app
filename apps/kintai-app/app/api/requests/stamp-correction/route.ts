import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, getApproverRoles, jsonOk, jsonError } from '@/lib/auth'
import { WORK_PLACES, recalculateAttendanceMinutes } from '@kintai/shared'

/** 打刻修正申請作成 */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return jsonError('認証が必要です', 401)

  try {
    const { date, checkInTime, checkOutTime, breakTotalMin, workPlace, note, reason } = await req.json()
    if (!date || !reason) return jsonError('日付と修正理由を入力してください', 400)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date).getTime())) return jsonError('日付はYYYY-MM-DD形式の有効な日付を入力してください', 400)
    if (workPlace && !(WORK_PLACES as readonly string[]).includes(workPlace)) {
      return jsonError('無効な勤務場所です', 400)
    }
    if (checkInTime && isNaN(new Date(checkInTime).getTime())) {
      return jsonError('出勤時刻が不正です', 400)
    }
    if (checkOutTime && isNaN(new Date(checkOutTime).getTime())) {
      return jsonError('退勤時刻が不正です', 400)
    }
    if (breakTotalMin !== undefined && breakTotalMin !== null) {
      if (typeof breakTotalMin !== 'number' || breakTotalMin < 0 || breakTotalMin > 24 * 60) {
        return jsonError('休憩時間が不正です（0〜1440分の範囲で入力してください）', 400)
      }
    }

    // 該当日のAttendanceレコードを検索
    const attendance = await prisma.attendance.findUnique({
      where: { userId_date: { userId: me.id, date } },
    })
    if (!attendance) return jsonError('該当日の勤怠レコードが見つかりません', 404)

    // 既にpendingの修正申請がないかチェック
    const existingCorrection = await prisma.stampCorrection.findFirst({
      where: { attendanceId: attendance.id, status: 'pending' },
    })
    if (existingCorrection) return jsonError('この日付の修正申請は既に存在します', 400)

    // 承認者を検索（既存パターンと同じ）
    const approverRoles = getApproverRoles(me.role)
    let approverId: string | null = null

    if (approverRoles.length > 0) {
      // #9: 同部署→全社のフォールバック（有給申請と統一）
      const approver = await prisma.user.findFirst({
        where: {
          role: { in: approverRoles },
          status: 'active',
          department: me.department,
        },
        orderBy: { employeeNumber: 'asc' },
      }) || await prisma.user.findFirst({
        where: {
          role: { in: approverRoles },
          status: 'active',
        },
        orderBy: { employeeNumber: 'asc' },
      })
      approverId = approver?.id || null
    }

    // StampCorrection + Approval をトランザクションで作成
    const result = await prisma.$transaction(async (tx) => {
      const correction = await tx.stampCorrection.create({
        data: {
          attendanceId: attendance.id,
          checkInTime: checkInTime ? new Date(checkInTime) : null,
          checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
          breakTotalMin: breakTotalMin !== undefined ? breakTotalMin : null,
          workPlace: workPlace || null,
          note: note !== undefined ? note : null,
          reason,
          status: 'pending',
        },
      })

      if (approverId) {
        await tx.approval.create({
          data: {
            stampCorrectionId: correction.id,
            requestType: 'stamp_correction',
            requesterId: me.id,
            approverId,
            status: 'pending',
          },
        })
      } else {
        // 承認者がいない場合（統括部長等）は自動承認
        // Bug #15: 自動承認でもApprovalレコードを作成（承認履歴を残す）
        await tx.approval.create({
          data: {
            stampCorrectionId: correction.id,
            requestType: 'stamp_correction',
            requesterId: me.id,
            approverId: me.id,
            status: 'approved',
            comment: '自動承認',
            processedAt: new Date(),
          },
        })
        await tx.stampCorrection.update({
          where: { id: correction.id },
          data: { status: 'applied' },
        })
        // Attendanceに直接反映
        const updateData: Record<string, unknown> = {}
        if (correction.checkInTime) updateData.checkInTime = correction.checkInTime
        if (correction.checkOutTime) updateData.checkOutTime = correction.checkOutTime
        if (correction.breakTotalMin !== null) updateData.breakTotalMin = correction.breakTotalMin
        if (correction.workPlace) updateData.workPlace = correction.workPlace
        if (correction.note !== null) updateData.note = correction.note

        // workMin / overtimeMin / lateMin / earlyLeaveMin を再計算
        const newCheckIn = correction.checkInTime ?? attendance.checkInTime
        const newCheckOut = correction.checkOutTime ?? attendance.checkOutTime
        if (newCheckIn && newCheckOut) {
          const breakMin =
            correction.breakTotalMin !== null
              ? correction.breakTotalMin
              : (attendance.breakTotalMin ?? 60)
          const calc = recalculateAttendanceMinutes({
            checkInTime: newCheckIn,
            checkOutTime: newCheckOut,
            breakTotalMin: breakMin,
            isHolidayWork: attendance.isHolidayWork,
          })
          updateData.workMin = calc.workMin
          updateData.overtimeMin = calc.overtimeMin
          updateData.lateMin = calc.lateMin
          updateData.earlyLeaveMin = calc.earlyLeaveMin
          updateData.status = 'done'

          // OvertimeRecord を同期更新
          const [yr, mo] = attendance.date.split('-').slice(0, 2).map(Number)
          const diff = calc.overtimeMin - (attendance.overtimeMin ?? 0)
          if (diff !== 0) {
            const existing = await tx.overtimeRecord.findUnique({
              where: { userId_year_month: { userId: attendance.userId, year: yr, month: mo } },
            })
            const safeTotalMin = Math.max(0, (existing?.totalMin ?? 0) + diff)
            await tx.overtimeRecord.upsert({
              where: { userId_year_month: { userId: attendance.userId, year: yr, month: mo } },
              create: { userId: attendance.userId, year: yr, month: mo, totalMin: Math.max(0, calc.overtimeMin) },
              update: { totalMin: safeTotalMin },
            })
          }
        }

        await tx.attendance.update({ where: { id: attendance.id }, data: updateData })
      }

      return correction
    })

    return jsonOk({ correction: result, message: '打刻修正申請を送信しました' }, 201)
  } catch (error) {
    console.error('Stamp correction request error:', error)
    return jsonError('打刻修正申請に失敗しました', 500)
  }
}

/** 自分の打刻修正申請履歴取得 */
export async function GET() {
  const me = await getCurrentUser()
  if (!me) return jsonError('認証が必要です', 401)

  try {
  const corrections = await prisma.stampCorrection.findMany({
    where: {
      attendance: { userId: me.id },
    },
    include: {
      attendance: { select: { date: true, checkInTime: true, checkOutTime: true, breakTotalMin: true, workPlace: true } },
      approval: { select: { id: true, status: true, comment: true, processedAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return jsonOk({ corrections })
  } catch (error) {
    console.error('GET stamp-corrections error:', error)
    return jsonError('取得に失敗しました', 500)
  }
}
