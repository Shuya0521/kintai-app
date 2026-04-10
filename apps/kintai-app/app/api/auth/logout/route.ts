import { cookies } from 'next/headers'
import { jsonOk } from '@/lib/auth'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set('kintai_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // #3: login と統一
    maxAge: 0,
    path: '/',
  })
  return jsonOk({ message: 'ログアウトしました' })
}
