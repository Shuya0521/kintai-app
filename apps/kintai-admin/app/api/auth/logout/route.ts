import { cookies } from 'next/headers'
import { jsonOk } from '@kintai/shared'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set('kintai_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return jsonOk({ message: 'ログアウトしました' })
}
