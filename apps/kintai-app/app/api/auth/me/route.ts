import { getCurrentUser, jsonOk, jsonError } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return jsonError('認証が必要です', 401)
  }
  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      name: `${user.lastName} ${user.firstName}`,
      lastName: user.lastName,
      firstName: user.firstName,
      role: user.role,
      department: user.department,
      workType: user.workType,
      paidLeaveBalance: user.paidLeaveBalance,
      av: user.lastName.charAt(0),
    },
  })
}
