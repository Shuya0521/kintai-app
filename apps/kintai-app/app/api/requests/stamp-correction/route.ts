import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, getApproverRoles, jsonOk, jsonError } from '@/lib/auth'
import { STANDARD_WORK_MIN } from '@kintai/shared'

/** 打刻修正申請作成 */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return jsonError('認証が必要です', 401)

  try {
    const { date, checkInTime, checkOutTime, breakTotalMin, workPlace, note, reason } = await req.json()
    if (!date || !reason) return jsonError('日付と修正理由を入力してください', 400)

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
      const approver = await prisma.user.findFirst({
        where: {
          role: { in: approverRoles },
          status: 'active',
          department: me.department,
        },
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

        // Bug C: workMin / overtimeMin を再計算
        const newCheckIn = correction.checkInTime ?? attendance.checkInTime
        const newCheckOut = correction.checkOutTime ?? attendance.checkOutTime
        if (newCheckIn && newCheckOut) {
          const breakMin =
            correction.breakTotalMin !== null
              ? correction.breakTotalMin
              : (attendance.breakTotalMin ?? 60)
          const workMin = Math.max(
            0,
            Math.floor((newCheckOut.getTime() - newCheckIn.getTime()) / 60000) - breakMin
          )
          const overtimeMin = Math.max(0, workMin - STANDARD_WORK_MIN)
          updateData.workMin = workMin
          updateData.overtimeMin = overtimeMin
          updateData.status = 'done'
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
}
