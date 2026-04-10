import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, getApproverRoles, jsonOk, jsonError } from '@/lib/auth'
import { sendMail, approvalRequestEmail } from '@kintai/shared/src/services/email.service'
import { LEAVE_TYPE_LABELS } from '@kintai/shared'

// Bug #1: startDate/endDate から日数を計算
function calcDays(type: string, startDate: string, endDate: string): number {
  if (type === 'half-am' || type === 'half-pm') return 0.5
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return jsonError('認証が必要です', 401)

  try {
    const { type, startDate, endDate, reason } = await req.json()
    if (!type || !startDate || !endDate) {
      return jsonError('申請種別と日付を入力してください', 400)
    }

    // Bug #6: 終了日が開始日より前の場合はエラー
    if (endDate < startDate) {
      return jsonError('終了日は開始日以降を指定してください', 400)
    }

    const days = calcDays(type, startDate, endDate)

    // Create leave request
    const request = await prisma.leaveRequest.create({
      data: {
        userId: me.id,
        type,
        startDate,
        endDate,
        days,
        reason: reason || '',
        status: 'pending',
      },
    })

    // Find approver based on role hierarchy
    const approverRoles = getApproverRoles(me.role)

    // 取締役・統括部長は承認不要（即承認）
    if (approverRoles.length === 0) {
      const updated = await prisma.leaveRequest.update({
        where: { id: request.id },
        data: { status: 'approved', processedAt: new Date() },
      })
      // Bug #3: paidLeaveBalance デクリメント
      if (type === 'vacation') {
        await prisma.user.update({ where: { id: me.id }, data: { paidLeaveBalance: { decrement: days } } })
      } else if (type === 'half-am' || type === 'half-pm') {
        await prisma.user.update({ where: { id: me.id }, data: { paidLeaveBalance: { decrement: 0.5 } } })
      }
      // Bug #2: updated を返す
      return jsonOk({ success: true, request: updated, autoApproved: true })
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
    const approverId = approver?.id || null

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
      const approverUser = await prisma.user.findUnique({ where: { id: approverId } })
      if (approverUser) {
        const typeLabel = LEAVE_TYPE_LABELS[type] || type
        const { subject, html } = approvalRequestEmail({
          approverName: `${approverUser.lastName} ${approverUser.firstName}`,
          requesterName: `${me.lastName} ${me.firstName}`,
          requestType: 'leave',
          details: `${typeLabel}: ${startDate}${startDate !== endDate ? ` 〜 ${endDate}` : ''}${reason ? `<br/>理由: ${reason}` : ''}`,
          adminUrl: process.env.ADMIN_URL || 'http://localhost:3001',
        })
        sendMail(approverUser.email, subject, html, 'approvalRequest').catch(() => {})
      }
    } else {
      // Auto-approve if no approver found
      const updated = await prisma.leaveRequest.update({
        where: { id: request.id },
        data: { status: 'approved', processedAt: new Date() },
      })

      // Deduct paid leave
      if (type === 'vacation') {
        await prisma.user.update({ where: { id: me.id }, data: { paidLeaveBalance: { decrement: days } } })
      } else if (type === 'half-am' || type === 'half-pm') {
        await prisma.user.update({ where: { id: me.id }, data: { paidLeaveBalance: { decrement: 0.5 } } })
      }

      return jsonOk({ request: updated, message: '申請を送信しました（自動承認）' }, 201)
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
