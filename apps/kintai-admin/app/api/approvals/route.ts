import { NextRequest } from 'next/server'
import { prisma, isApproverRole, LEAVE_TYPE_DAYS, jsonOk, jsonError } from '@kintai/shared'
import { sendMail, approvalResultEmail } from '@kintai/shared/src/services/email.service'
import { getCurrentAdmin } from '@/lib/auth'

export async function GET() {
  const me = await getCurrentAdmin()
  if (!me || !isApproverRole(me.role)) return jsonError('権限がありません', 403)

  const approvals = await prisma.approval.findMany({
    where: { approverId: me.id },
    orderBy: { createdAt: 'desc' },
    include: {
      leaveRequest: true,
      requester: {
        select: { id: true, lastName: true, firstName: true, department: true, role: true },
      },
    },
  })

  return jsonOk({ approvals })
}

export async function POST(req: NextRequest) {
  const me = await getCurrentAdmin()
  if (!me || !isApproverRole(me.role)) return jsonError('権限がありません', 403)

  try {
    const { approvalId, action, comment } = await req.json()
    if (!approvalId || !action) return jsonError('承認IDとアクションが必要です', 400)
    if (!['approve', 'reject'].includes(action)) return jsonError('無効なアクションです', 400)

    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: { leaveRequest: true },
    })
    if (!approval) return jsonError('承認レコードが見つかりません', 404)
    if (approval.status !== 'pending') return jsonError('この申請は既に処理済みです', 400)

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    await prisma.$transaction(async (tx) => {
      await tx.approval.update({
        where: { id: approvalId },
        data: { status: newStatus, comment: comment || '', processedAt: new Date() },
      })

      if (approval.leaveRequestId) {
        await tx.leaveRequest.update({
          where: { id: approval.leaveRequestId },
          data: { status: newStatus, processedAt: new Date() },
        })

        if (action === 'approve' && approval.leaveRequest) {
          const deductDays = LEAVE_TYPE_DAYS[approval.leaveRequest.type] || 0
          if (deductDays > 0) {
            await tx.user.update({
              where: { id: approval.requesterId },
              data: { paidLeaveBalance: { decrement: deductDays } },
            })
          }
        }
      }
    })

    // メール通知（非同期、失敗してもレスポンスには影響しない）
    const requester = await prisma.user.findUnique({ where: { id: approval.requesterId } })
    if (requester) {
      const { subject, html } = approvalResultEmail({
        requesterName: `${requester.lastName} ${requester.firstName}`,
        requestType: approval.requestType,
        result: newStatus as 'approved' | 'rejected',
        comment: comment || '',
        approverName: `${me.lastName} ${me.firstName}`,
      })
      sendMail(requester.email, subject, html, 'approvalResult').catch(() => {})
    }

    return jsonOk({ message: action === 'approve' ? '承認しました' : '却下しました' })
  } catch (error) {
    console.error('Approval error:', error)
    return jsonError('処理に失敗しました', 500)
  }
}
