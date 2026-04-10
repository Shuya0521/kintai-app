import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { prisma, verifyPassword, createToken, isAdminRole, jsonOk, jsonError, checkLockout, calculateLockout, loginSchema } from '@kintai/shared'

export async function POST(req: NextRequest) {
  try {
    // #18: zodバリデーション適用
    const parsed = loginSchema.safeParse(await req.json())
    if (!parsed.success) return jsonError('メールアドレスとパスワードを入力してください', 400)
    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return jsonError('メールアドレスまたはパスワードが正しくありません', 401)

    // 管理者ロールチェック
    // #22: ロール不一致でも汎用エラーを返す（ユーザー列挙防止）
    if (!isAdminRole(user.role)) {
      return jsonError('メールアドレスまたはパスワードが正しくありません', 401)
    }

    if (user.status !== 'active') return jsonError('このアカウントは無効化されています', 403)

    // ロックアウトチェック＆失敗カウントをトランザクション内で原子的に処理
    const authResult = await prisma.$transaction(async (tx) => {
      const latest = await tx.user.findUnique({
        where: { id: user.id },
        select: { failedLoginAttempts: true, lockedUntil: true, passwordHash: true },
      })
      if (!latest) return { status: 'not_found' as const }

      const lockout = checkLockout(latest.failedLoginAttempts, latest.lockedUntil)
      if (lockout.locked) return { status: 'locked' as const, message: lockout.message }

      const valid = await verifyPassword(password, latest.passwordHash)
      if (!valid) {
        const newAttempts = latest.failedLoginAttempts + 1
        const newLockout = calculateLockout(newAttempts)
        await tx.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: newAttempts, lockedUntil: newLockout.lockedUntil || null },
        })
        return { status: 'invalid_password' as const }
      }

      await tx.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      })
      return { status: 'ok' as const }
    })

    if (authResult.status === 'not_found' || authResult.status === 'invalid_password') {
      return jsonError('メールアドレスまたはパスワードが正しくありません', 401)
    }
    if (authResult.status === 'locked') {
      return jsonError(authResult.message || 'アカウントがロックされています', 423)
    }

    const token = createToken(user.id, user.role)
    const cookieStore = await cookies()
    cookieStore.set('kintai_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return jsonOk({
      user: {
        id: user.id,
        email: user.email,
        name: `${user.lastName} ${user.firstName}`,
        role: user.role,
        department: user.department,
      },
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return jsonError('ログインに失敗しました', 500)
  }
}
