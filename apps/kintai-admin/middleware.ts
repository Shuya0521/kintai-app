import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, isAdminRole } from '@kintai/shared'

/**
 * 管理者用アプリ — 認証 + ロールガード ミドルウェア
 *
 * 公開ルート以外はJWT認証 + 管理者ロールチェックを強制。
 * 一般社員がアクセスした場合は403を返す。
 */

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
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
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const payload = verifyToken(token)
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'トークンが無効です' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/login', req.url))
    response.cookies.delete('kintai_token')
    return response
  }

  // 管理者ロールチェック
  if (!isAdminRole(payload.role)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }
    // 一般社員は管理画面にアクセス不可 → ログインページに戻す
    return NextResponse.redirect(new URL('/login?error=forbidden', req.url))
  }

  // セキュリティヘッダー追加
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
}

export const runtime = 'nodejs'

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
