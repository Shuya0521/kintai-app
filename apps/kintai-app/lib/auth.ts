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

// ── Get current user from request cookies ────────
export async function getCurrentUser() {
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
      lastNameKana: true,
      firstNameKana: true,
      phone: true,
      avatarUrl: true,
      role: true,
      department: true,
      workType: true,
      hireDate: true,
      paidLeaveBalance: true,
      status: true,
      mustChangePassword: true,
    },
  })

  if (!user || user.status !== 'active') return null
  return user
}

// Re-export for convenience
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
