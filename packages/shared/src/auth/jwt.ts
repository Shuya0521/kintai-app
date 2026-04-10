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

/** アクセストークン生成（有効期限1日） */
export function createAccessToken(userId: string, role?: string): string {
  return jwt.sign({ userId, role: role || '', type: 'access' } satisfies TokenPayload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  })
}

/** リフレッシュトークン生成（有効期限14日） */
export function createRefreshToken(userId: string, role?: string): string {
  return jwt.sign({ userId, role: role || '', type: 'refresh' } satisfies TokenPayload, getJwtSecret(), {
    expiresIn: '14d',
  })
}

/** トークン検証（typeチェック付き） */
export function verifyToken(token: string, expectedType: 'access' | 'refresh' = 'access'): TokenPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as TokenPayload
    if (payload.type !== expectedType) return null // #2: refresh tokenの不正利用防止
    return payload
  } catch {
    return null
  }
}

/** 後方互換: 旧createToken（アクセストークンを返す） */
export function createToken(userId: string, role?: string): string {
  return createAccessToken(userId, role)
}
