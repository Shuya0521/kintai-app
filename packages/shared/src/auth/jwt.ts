import jwt from 'jsonwebtoken'
import { ACCESS_TOKEN_EXPIRY } from '../constants'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET 環境変数が設定されていません。アプリケーションを起動できません。')
  }
  return secret
}

export interface TokenPayload {
  userId: string
  role: string
  type: 'access' | 'refresh'
}

/** アクセストークン生成（有効期限15分） */
export function createAccessToken(userId: string, role?: string): string {
  return jwt.sign({ userId, role: role || '', type: 'access' } satisfies TokenPayload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  })
}

/** リフレッシュトークン生成（有効期限7日） */
export function createRefreshToken(userId: string, role?: string): string {
  return jwt.sign({ userId, role: role || '', type: 'refresh' } satisfies TokenPayload, getJwtSecret(), {
    expiresIn: '7d',
  })
}

/** トークン検証 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload
  } catch {
    return null
  }
}

/** 後方互換: 旧createToken（アクセストークンを返す） */
export function createToken(userId: string, role?: string): string {
  return createAccessToken(userId, role)
}
