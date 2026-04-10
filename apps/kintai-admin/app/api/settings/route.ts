import { NextRequest } from 'next/server'
import { prisma, jsonOk, jsonError } from '@kintai/shared'
import { getCurrentAdmin } from '@/lib/auth'

export async function GET() {
  const me = await getCurrentAdmin()
  if (!me) return jsonError('権限がありません', 403)

  const settings = await prisma.setting.findMany()
  const result: Record<string, unknown> = {}
  for (const s of settings) {
    try {
      result[s.key] = JSON.parse(s.value)
    } catch {
      result[s.key] = s.value
    }
  }
  return jsonOk({ settings: result })
}

export async function POST(req: NextRequest) {
  const me = await getCurrentAdmin()
  if (!me) return jsonError('権限がありません', 403)

  try {
    const body = await req.json()

    // バルク保存: オブジェクトのキー・バリューを一括保存
    if (body && typeof body === 'object' && !body.key) {
      const entries = Object.entries(body)
      for (const [key, value] of entries) {
        await prisma.setting.upsert({
          where: { key },
          create: { key, value: JSON.stringify(value) },
          update: { value: JSON.stringify(value) },
        })
      }
      return jsonOk({ message: '設定を保存しました' })
    }

    // 単一保存（後方互換）
    const { key, value } = body
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
