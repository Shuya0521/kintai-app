/**
 * 監査ログ — セキュリティ・コンプライアンス対応
 *
 * 記録対象:
 *   - ログイン/ログアウト
 *   - 打刻（出勤/退勤/休憩）
 *   - 承認/却下
 *   - ユーザー作成/更新/削除
 *   - パスワード変更
 *   - 設定変更
 */

import { prisma } from '../db'

export type AuditAction =
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'stamp_in'
  | 'stamp_out'
  | 'stamp_break'
  | 'approve'
  | 'reject'
  | 'create'
  | 'update'
  | 'delete'
  | 'password_change'
  | 'export'
  | 'settings_change'

export type AuditTargetType =
  | 'user'
  | 'attendance'
  | 'leave_request'
  | 'approval'
  | 'setting'
  | 'excel_export'

export interface AuditLogInput {
  userId?: string | null
  action: AuditAction
  targetType: AuditTargetType
  targetId?: string
  details?: Record<string, unknown>
  ipAddress?: string
}

/**
 * 監査ログを記録する
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId || null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId || '',
        details: input.details ? JSON.stringify(input.details) : '',
        ipAddress: input.ipAddress || '',
      },
    })
  } catch (err) {
    // 監査ログの失敗でメイン処理を止めない
    console.error('[AuditLog] Failed to create log:', err)
  }
}

/**
 * リクエストからIPアドレスを取得
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp

  return '127.0.0.1'
}

/**
 * 監査ログ検索（管理画面用）
 */
export async function searchAuditLogs(params: {
  userId?: string
  action?: string
  targetType?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}) {
  const where: Record<string, unknown> = {}

  if (params.userId) where.userId = params.userId
  if (params.action) where.action = params.action
  if (params.targetType) where.targetType = params.targetType

  if (params.startDate || params.endDate) {
    const createdAt: Record<string, Date> = {}
    if (params.startDate) createdAt.gte = params.startDate
    if (params.endDate) createdAt.lte = params.endDate
    where.createdAt = createdAt
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { employeeNumber: true, lastName: true, firstName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
      skip: params.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ])

  return { logs, total }
}
