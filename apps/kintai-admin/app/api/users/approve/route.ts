import { NextRequest } from 'next/server'
import { prisma, jsonOk, jsonError } from '@kintai/shared'
import { getCurrentAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const me = await getCurrentAdmin()
  if (!me) return jsonError('権限がありません', 403)

  try {
    const { userId } = await req.json()
    if (!userId) return jsonError('ユーザーIDが必要です', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return jsonError('ユーザーが見つかりません', 404)
    if (user.status !== 'pending') return jsonError('このユーザーは承認待ちではありません', 400)

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: 'active' },
      select: { id: true, email: true, lastName: true, firstName: true, status: true },
    })

    return jsonOk({ user: updated, message: `${updated.lastName} ${updated.firstName}さんのアカウントを承認しました` })
  } catch (error) {
    console.error('Approve error:', error)
    return jsonError('承認に失敗しました', 500)
  }
}
