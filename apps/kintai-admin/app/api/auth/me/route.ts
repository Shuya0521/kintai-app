import { getCurrentAdmin, jsonOk, jsonError } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentAdmin()
  if (!user) return jsonError('認証が必要です', 401)

  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      name: `${user.lastName} ${user.firstName}`,
      role: user.role,
      department: user.department,
    },
  })
}
