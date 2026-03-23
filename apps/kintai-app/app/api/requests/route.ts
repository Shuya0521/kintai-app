import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, getApproverRoles, jsonOk, jsonError } from '@/lib/auth'
import { sendMail, approvalRequestEmail } from '@kintai/shared/src/services/email.service'
import { LEAVE_TYPE_LABELS } from '@kintai/shared'

export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return jsonError('認証が必要です', 401)

  try {
    const { type, startDate, endDate, reason } = await req.json()
    if (!type || !startDate || !endDate) {
      return jsonError('申請種別と日付を入力してください', 400)
    }

    // Create leave request
    const request = await prisma.leaveRequest.create({
      data: {
        userId: me.id,
        type,
        startDate,
        endDate,
        reason: reason || '',
        status: 'pending',
      },
    })

    // Find approver based on role hierarchy
    const approverRoles = getApproverRoles(me.role)
    let approverId: string | null = null

    // 取締役・統括部長は承認不要（即承認）
    if (approverRoles.length === 0) {
      await prisma.leaveRequest.update({
        where: { id: request.id },
        data: { status: 'approved', processedAt: new Date() },
      })
      return jsonOk({ success: true, request, autoApproved: true })
    }

    // 承認者ロール検索: まず同部署、なければ全社から
    const approver = await prisma.user.findFirst({
      where: {
        role: { in: approverRoles },
        status: 'active',
        department: me.department,
      },
    }) || await prisma.user.findFirst({
      where: {
        role: { in: approverRoles },
        status: 'active',
      },
    })
    approverId = approver?.id || null

    // Create approval record
    if (approverId) {
      await prisma.approval.create({
        data: {
          leaveRequestId: request.id,
          requestType: 'leave',
          requesterId: me.id,
          approverId,
          status: 'pending',
        },
      })

      // 承認者にメール通知（非同期）
      const approver = await prisma.user.findUnique({ where: { id: approverId } })
      if (approver) {
        const typeLabel = LEAVE_TYPE_LABELS[type] || type
        const { subject, html } = approvalRequestEmail({
          approverName: `${approver.lastName} ${approver.firstName}`,
          requesterName: `${me.lastName} ${me.firstName}`,
          requestType: 'leave',
          details: `${typeLabel}: ${startDate}${startDate !== endDate ? ` 〜 ${endDate}` : ''}${reason ? `<br/>理由: ${reason}` : ''}`,
          adminUrl: process.env.ADMIN_URL || 'http://localhost:3001',
        })
        sendMail(approver.email, subject, html, 'approvalRequest').catch(() => {})
      }
    } else {
      // Auto-approve if no approver (e.g. 統括部長)
      await prisma.leaveRequest.update({
        where: { id: request.id },
        data: { status: 'approved', processedAt: new Date() },
      })

      // Deduct paid leave
      if (type === 'vacation') {
        await prisma.user.update({
          where: { id: me.id },
          data: { paidLeaveBalance: { decrement: 1 } },
        })
      } else if (type === 'half-am' || type === 'half-pm') {
        await prisma.user.update({
          where: { id: me.id },
          data: { paidLeaveBalance: { decrement: 0.5 } },
        })
      }
    }

    return jsonOk({ request, message: '申請を送信しました' }, 201)
  } catch (error) {
    console.error('Request error:', error)
    return jsonError('申請に失敗しました', 500)
  }
}

export async function GET() {
  const me = await getCurrentUser()
  if (!me) return jsonError('認証が必要です', 401)

  const requests = await prisma.leaveRequest.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'desc' },
    include: {
      approval: {
        select: { id: true, status: true, comment: true, approverId: true, processedAt: true },
      },
    },
  })

  return jsonOk({ requests })
}
