import { ADMIN_ROLES, APPROVER_ROLES, EXPORT_ROLES } from '../constants'

/** 管理者ロールかどうか判定 */
export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role)
}

/** 承認権限を持つロールかどうか判定 */
export function isApproverRole(role: string): boolean {
  return APPROVER_ROLES.includes(role)
}

/** Excel出力権限を持つロールかどうか判定（部長から上） */
export function isExportRole(role: string): boolean {
  return EXPORT_ROLES.includes(role)
}

/**
 * 申請者のロールに応じた承認者ロールを返す
 * - 一般社員/主査/主事/リーダー/課長/所長/所長代理 → 同部署の部長
 * - 部長 → 統括部長
 * - 統括部長 → 空配列（自動承認 or 管理者承認）
 */
export function getApproverRoles(role: string): string[] {
  if (role === '部長') {
    return ['統括部長']
  }
  if (role === '統括部長') {
    return []
  }
  return ['部長']
}
