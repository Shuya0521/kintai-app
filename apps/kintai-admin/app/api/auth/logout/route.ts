import { cookies } from 'next/headers'
import { jsonOk } from '@kintai/shared'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set('kintai_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // #47: kintai-appと統一（Logout CSRF防止）
    maxAge: 0,
    path: '/',
  })
  return jsonOk({ message: 'ログアウトしました' })
}
