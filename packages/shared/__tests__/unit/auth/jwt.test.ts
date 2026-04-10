import { describe, it, expect, beforeAll } from 'vitest'
import { createAccessToken, createRefreshToken, verifyToken, createToken } from '../../../src/auth/jwt'

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-vitest-2026'
})

describe('JWT token', () => {
  it('J-01: createAccessToken → verifyToken でpayload一致', () => {
    const token = createAccessToken('user-123', '社員')
    const payload = verifyToken(token)
    expect(payload).not.toBeNull()
    expect(payload!.userId).toBe('user-123')
    expect(payload!.role).toBe('社員')
    expect(payload!.type).toBe('access')
  })

  it('J-01b: createRefreshToken → verifyToken(refresh) でpayload一致', () => {
    const token = createRefreshToken('user-456', '部長')
    const payload = verifyToken(token, 'refresh')
    expect(payload).not.toBeNull()
    expect(payload!.userId).toBe('user-456')
    expect(payload!.role).toBe('部長')
    expect(payload!.type).toBe('refresh')
  })

  it('J-02: 不正トークン → null', () => {
    const payload = verifyToken('invalid.token.string')
    expect(payload).toBeNull()
  })

  it('J-02b: 空文字 → null', () => {
    const payload = verifyToken('')
    expect(payload).toBeNull()
  })

  it('J-01c: createToken（後方互換）→ accessトークン', () => {
    const token = createToken('user-789', 'リーダー')
    const payload = verifyToken(token)
    expect(payload).not.toBeNull()
    expect(payload!.type).toBe('access')
  })

  it('J-01d: role省略時 → Error throw（role必須化済み）', () => {
    expect(() => createAccessToken('user-000', '')).toThrow('role is required')
  })
})

describe('JWT_SECRET未設定', () => {
  it('J-03: JWT_SECRET未設定 → Error throw', () => {
    const original = process.env.JWT_SECRET
    delete process.env.JWT_SECRET
    expect(() => createAccessToken('user-x', '社員')).toThrow('JWT_SECRET')
    process.env.JWT_SECRET = original
  })
})
