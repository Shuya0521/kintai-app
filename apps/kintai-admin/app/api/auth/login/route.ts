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

    // ロックアウトチェック
    const lockout = checkLockout(user.failedLoginAttempts, user.lockedUntil)
    if (lockout.locked) return jsonError(lockout.message || 'アカウントがロックされています', 423)

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      const newAttempts = user.failedLoginAttempts + 1
      const newLockout = calculateLockout(newAttempts)
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: newAttempts, lockedUntil: newLockout.lockedUntil || null },
      })
      return jsonError('メールアドレスまたはパスワードが正しくありません', 401)
    }

    // ログイン成功
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    })

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
