import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifyPassword, createToken, jsonOk, jsonError } from '@/lib/auth'
import { checkLockout, calculateLockout, loginSchema } from '@kintai/shared'

export async function POST(req: NextRequest) {
  try {
    // #18: zodバリデーション適用
    const parsed = loginSchema.safeParse(await req.json())
    if (!parsed.success) {
      return jsonError('メールアドレスとパスワードを入力してください', 400)
    }
    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return jsonError('メールアドレスまたはパスワードが正しくありません', 401)
    }

    if (user.status === 'pending') {
      return jsonError('アカウントは承認待ちです。管理者の承認をお待ちください。', 403)
    }
    if (user.status === 'retired') {
      return jsonError('このアカウントは無効化されています', 403)
    }

    // ロックアウトチェック
    const lockout = checkLockout(user.failedLoginAttempts, user.lockedUntil)
    if (lockout.locked) {
      return jsonError(lockout.message || 'アカウントがロックされています', 423)
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      // 失敗回数インクリメント
      const newAttempts = user.failedLoginAttempts + 1
      const newLockout = calculateLockout(newAttempts)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil: newLockout.lockedUntil || null,
        },
      })
      return jsonError('メールアドレスまたはパスワードが正しくありません', 401)
    }

    // ログイン成功: 失敗回数リセット
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
        av: user.lastName.charAt(0),
      },
      mustChangePassword: user.mustChangePassword,
    })
  } catch (error) {
    console.error('Login error:', error)
    return jsonError('ログインに失敗しました', 500)
  }
}
