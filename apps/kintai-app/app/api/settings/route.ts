import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, isAdminRole, jsonOk, jsonError } from '@/lib/auth'

export async function GET() {
  const me = await getCurrentUser()
  if (!me || !isAdminRole(me.role)) return jsonError('権限がありません', 403)

  const settings = await prisma.setting.findMany()
  const result: Record<string, string> = {}
  for (const s of settings) {
    result[s.key] = s.value
  }
  return jsonOk({ settings: result })
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me || !isAdminRole(me.role)) return jsonError('権限がありません', 403)

  try {
    const { key, value } = await req.json()
    if (!key) return jsonError('設定キーが必要です', 400)

    await prisma.setting.upsert({
      where: { key },
      create: { key, value: JSON.stringify(value) },
      update: { value: JSON.stringify(value) },
    })

    return jsonOk({ message: '設定を保存しました' })
  } catch (error) {
    console.error('Settings error:', error)
    return jsonError('設定の保存に失敗しました', 500)
  }
}
