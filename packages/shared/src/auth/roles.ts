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
 * - 一般社員/主査/主事/リーダー/課長/所長/所長代理/システム管理者 → 同部署の部長
 * - 部長 → 取締役（統括部長不在のため）
 * - 取締役/統括部長 → 空配列（申請即承認）
 */
export function getApproverRoles(role: string): string[] {
  if (role === '取締役' || role === '統括部長') {
    return []
  }
  if (role === '部長') {
    return ['取締役']
  }
  return ['部長']
}
