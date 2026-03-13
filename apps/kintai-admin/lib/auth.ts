import { cookies } from 'next/headers'
import {
  prisma,
  verifyToken,
  createToken,
  hashPassword,
  verifyPassword,
  isAdminRole,
  getApproverRoles,
  jsonOk,
  jsonError,
} from '@kintai/shared'

/** 管理者用 getCurrentUser: ロールチェック込み */
export async function getCurrentAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('kintai_token')?.value
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      employeeNumber: true,
      lastName: true,
      firstName: true,
      role: true,
      department: true,
      status: true,
    },
  })

  if (!user || user.status !== 'active') return null
  if (!isAdminRole(user.role)) return null

  return user
}

export {
  createToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  isAdminRole,
  getApproverRoles,
  jsonOk,
  jsonError,
}
