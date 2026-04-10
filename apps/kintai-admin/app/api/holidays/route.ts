import { NextRequest } from 'next/server'
import { prisma, jsonOk, jsonError } from '@kintai/shared'
import { getCurrentAdmin } from '@/lib/auth'

/** PUT /api/holidays?year=2026 — 内閣府APIから祝日を自動取得してDBに保存 */
export async function PUT(req: NextRequest) {
  const me = await getCurrentAdmin()
  if (!me) return jsonError('認証が必要です', 401)

  try {
    const year = Number(req.nextUrl.searchParams.get('year') || new Date().getFullYear())

    const res = await fetch('https://holidays-jp.github.io/api/v1/date.json', {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return jsonError('祝日APIへの接続に失敗しました', 502)

    const allData: Record<string, string> = await res.json()
    const yearHolidays = Object.entries(allData)
      .filter(([date]) => date.startsWith(String(year)))
      .map(([date, name]) => ({ date, name, year }))

    if (yearHolidays.length === 0) {
      return jsonError(`${year}年の祝日データが見つかりませんでした`, 404)
    }

    await Promise.all(
      yearHolidays.map(h =>
        prisma.holiday.upsert({
          where: { date: h.date },
          update: { name: h.name, year: h.year },
          create: h,
        })
      )
    )

    const holidays = await prisma.holiday.findMany({ where: { year }, orderBy: { date: 'asc' } })
    return jsonOk({ count: yearHolidays.length, holidays })
  } catch (error) {
    console.error('PUT holidays error:', error)
    return jsonError('祝日データの取得に失敗しました', 500)
  }
}

/** GET /api/holidays?year=2026 — 祝日一覧取得 */
export async function GET(req: NextRequest) {
  const me = await getCurrentAdmin()
  if (!me) return jsonError('認証が必要です', 401)

  try {
    const year = Number(req.nextUrl.searchParams.get('year') || new Date().getFullYear())
    const holidays = await prisma.holiday.findMany({
      where: { year },
      orderBy: { date: 'asc' },
    })
    return jsonOk({ holidays })
  } catch (error) {
    console.error('GET holidays error:', error)
    return jsonError('取得に失敗しました', 500)
  }
}

/** POST /api/holidays — 祝日追加（単件 or 一括インポート） */
export async function POST(req: NextRequest) {
  const me = await getCurrentAdmin()
  if (!me) return jsonError('認証が必要です', 401)

  try {
    const body = await req.json()

    if (Array.isArray(body.holidays)) {
      const data = body.holidays.map((h: { date: string; name: string }) => ({
        date: h.date,
        name: h.name,
        year: Number(h.date.slice(0, 4)),
      }))
      await Promise.all(
        data.map((h: { date: string; name: string; year: number }) =>
          prisma.holiday.upsert({
            where: { date: h.date },
            update: { name: h.name, year: h.year },
            create: h,
          })
        )
      )
      return jsonOk({ count: data.length })
    }

    const { date, name } = body
    if (!date || !name) return jsonError('date と name は必須です', 400)
    const year = Number(date.slice(0, 4))
    const holiday = await prisma.holiday.upsert({
      where: { date },
      update: { name, year },
      create: { date, name, year },
    })
    return jsonOk({ holiday })
  } catch (error) {
    console.error('POST holidays error:', error)
    return jsonError('祝日の保存に失敗しました', 500)
  }
}

/** DELETE /api/holidays?date=2026-01-01 — 祝日削除 */
export async function DELETE(req: NextRequest) {
  const me = await getCurrentAdmin()
  if (!me) return jsonError('認証が必要です', 401)

  const date = req.nextUrl.searchParams.get('date')
  if (!date) return jsonError('date パラメータが必要です', 400)

  const deleted = await prisma.holiday.delete({ where: { date } }).catch(() => null)
  if (!deleted) return jsonError('指定した祝日が見つかりません', 404)
  return jsonOk({ deleted: date })
}
