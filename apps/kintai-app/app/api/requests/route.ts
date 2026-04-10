import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, getApproverRoles, jsonOk, jsonError } from '@/lib/auth'
import { sendMail, approvalRequestEmail } from '@kintai/shared/src/services/email.service'
import { LEAVE_TYPE_LABELS } from '@kintai/shared'

// 日数を計算（土日除外）
function calcDays(type: string, startDate: string, endDate: string): number {
  if (type === 'half-am' || type === 'half-pm') return 0.5
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const end = new Date(ey, em - 1, ed)
  let count = 0
  const d = new Date(start)
  while (d <= end) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) count++ // 土日除外
    d.setDate(d.getDate() + 1)
  }
  return count || 1
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

    // Bug #4: 申請時に残日数チェック
    if (type === 'vacation' || type === 'half-am' || type === 'half-pm') {
      if (me.paidLeaveBalance < days) {
        return jsonError(`有給残日数が不足しています（残${me.paidLeaveBalance}日、必要${days}日）`, 400)
      }
    }

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
      // Bug #12: days > 0 で統一判定
      if (days > 0) {
        await prisma.user.update({ where: { id: me.id }, data: { paidLeaveBalance: { decrement: days } } })
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

      // Deduct paid leave（days > 0 で統一判定）
      if (days > 0) {
        await prisma.user.update({ where: { id: me.id }, data: { paidLeaveBalance: { decrement: days } } })
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
