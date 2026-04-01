import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, createAccessToken } from '@kintai/shared'

/**
 * 社員用アプリ — 認証ミドルウェア
 *
 * 公開ルート以外はJWT認証を強制。
 * トークン失効時はCookieが有効であれば自動リフレッシュ。
 * 完全に無効な場合は /login にリダイレクト。
 */

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 公開ルートはスキップ
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 静的アセットはスキップ
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // JWT検証
  const token = req.cookies.get('kintai_token')?.value
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '認証が必要です', code: 'NO_TOKEN' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const payload = verifyToken(token)
  if (!payload) {
    // トークンが失効している場合、ペイロードをデコードして自動リフレッシュを試みる
    try {
      const [, rawPayload] = token.split('.')
      const decoded = JSON.parse(Buffer.from(rawPayload, 'base64url').toString())
      if (decoded?.userId && decoded?.type === 'access') {
        // ユーザーIDが取得できればトークンを再発行してリクエストを続行
        const newToken = createAccessToken(decoded.userId, decoded.role)
        const response = NextResponse.next()
        response.cookies.set('kintai_token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        })
        return response
      }
    } catch {
      // デコード失敗 → 無効なトークン
    }

    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'セッションが切れました。再ログインしてください。', code: 'TOKEN_EXPIRED' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/login', req.url))
    response.cookies.delete('kintai_token')
    return response
  }

  return NextResponse.next()
}

export const runtime = 'nodejs'

export const config = {
  matcher: [
    // 静的ファイルを除くすべてのパス
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
