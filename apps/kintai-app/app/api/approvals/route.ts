import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, jsonOk, jsonError } from '@/lib/auth'
import { isApproverRole, STANDARD_WORK_MIN } from '@kintai/shared'

export async function GET() {
  const me = await getCurrentUser()
  if (!me || !isApproverRole(me.role)) return jsonError('権限がありません', 403)

  // N+1クエリ修正: include で requester を一括取得
  const approvals = await prisma.approval.findMany({
    where: { approverId: me.id },
    orderBy: { createdAt: 'desc' },
    include: {
      leaveRequest: true,
      stampCorrection: {
        include: {
          attendance: true,
        },
      },
      requester: {
        select: { id: true, lastName: true, firstName: true, department: true, role: true },
      },
    },
  })

  return jsonOk({ approvals })
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me || !isApproverRole(me.role)) return jsonError('権限がありません', 403)

  try {
    const { approvalId, action, comment } = await req.json()
    if (!approvalId || !action) return jsonError('承認IDとアクションが必要です', 400)
    if (!['approve', 'reject'].includes(action)) return jsonError('無効なアクションです', 400)

    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        leaveRequest: true,
        stampCorrection: {
          include: { attendance: true },
        },
      },
    })
    if (!approval) return jsonError('承認レコードが見つかりません', 404)
    if (approval.status !== 'pending') return jsonError('この申請は既に処理済みです', 400)

    // Bug #2: 自分宛ての承認のみ処理可能
    if (approval.approverId !== me.id) {
      return jsonError('この申請の承認権限がありません', 403)
    }

    // Bug D: 有給承認前に残日数チェック
    if (action === 'approve' && approval.leaveRequest) {
      const deductDays = approval.leaveRequest.days
      if (deductDays > 0) {
        const requester = await prisma.user.findUnique({ where: { id: approval.requesterId } })
        if (requester && requester.paidLeaveBalance < deductDays) {
          return jsonError(
            `有給残日数が不足しています（残${requester.paidLeaveBalance}日、必要${deductDays}日）`,
            400
          )
        }
      }
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // トランザクションで原子性を保証
    await prisma.$transaction(async (tx) => {
      await tx.approval.update({
        where: { id: approvalId },
        data: { status: newStatus, comment: comment || '', processedAt: new Date() },
      })

      // 有給申請の処理
      if (approval.leaveRequestId && approval.leaveRequest) {
        await tx.leaveRequest.update({
          where: { id: approval.leaveRequestId },
          data: { status: newStatus, processedAt: new Date() },
        })

        if (action === 'approve') {
          // Bug A: leaveRequest.days を使って実際の日数分控除
          const deductDays = approval.leaveRequest.days
          if (deductDays > 0) {
            await tx.user.update({
              where: { id: approval.requesterId },
              data: { paidLeaveBalance: { decrement: deductDays } },
            })
          }
        }
      }

      // Bug B: 打刻修正申請の処理
      if (approval.stampCorrectionId && approval.stampCorrection) {
        const correction = approval.stampCorrection
        const correctionStatus = action === 'approve' ? 'applied' : 'rejected'

        await tx.stampCorrection.update({
          where: { id: approval.stampCorrectionId },
          data: { status: correctionStatus },
        })

        if (action === 'approve' && correction.attendance) {
          const attendance = correction.attendance
          const updateData: Record<string, unknown> = {}

          if (correction.checkInTime) updateData.checkInTime = correction.checkInTime
          if (correction.checkOutTime) updateData.checkOutTime = correction.checkOutTime
          if (correction.breakTotalMin !== null) updateData.breakTotalMin = correction.breakTotalMin
          if (correction.workPlace) updateData.workPlace = correction.workPlace
          if (correction.note !== null) updateData.note = correction.note

          // workMin / overtimeMin を再計算
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

            // OvertimeRecord を同期更新（月次残業集計の整合性を保つ）
            const [yr, mo] = attendance.date.split('-').slice(0, 2).map(Number)
            const diff = overtimeMin - (attendance.overtimeMin ?? 0)
            if (diff !== 0) {
              const existing = await tx.overtimeRecord.findUnique({
                where: { userId_year_month: { userId: attendance.userId, year: yr, month: mo } },
              })
              const safeTotalMin = Math.max(0, (existing?.totalMin ?? 0) + diff)
              await tx.overtimeRecord.upsert({
                where: { userId_year_month: { userId: attendance.userId, year: yr, month: mo } },
                create: { userId: attendance.userId, year: yr, month: mo, totalMin: Math.max(0, overtimeMin) },
                update: { totalMin: safeTotalMin },
              })
            }
          }

          await tx.attendance.update({
            where: { id: attendance.id },
            data: updateData,
          })
        }
      }
    })

    return jsonOk({ message: action === 'approve' ? '承認しました' : '却下しました' })
  } catch (error) {
    console.error('Approval error:', error)
    return jsonError('処理に失敗しました', 500)
  }
}
