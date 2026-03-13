import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, validatePasswordStrength } from '../../../src/auth/password'

describe('hashPassword / verifyPassword', () => {
  it('P-01: hash → verify 正常', async () => {
    const hash = await hashPassword('TestPass123')
    const valid = await verifyPassword('TestPass123', hash)
    expect(valid).toBe(true)
  })

  it('P-02: verify 異なるパスワード → false', async () => {
    const hash = await hashPassword('TestPass123')
    const valid = await verifyPassword('WrongPass456', hash)
    expect(valid).toBe(false)
  })

  it('P-01b: 同じパスワードでもハッシュは毎回異なる', async () => {
    const hash1 = await hashPassword('TestPass123')
    const hash2 = await hashPassword('TestPass123')
    expect(hash1).not.toBe(hash2)
  })
})

describe('validatePasswordStrength', () => {
  it('P-03: 7文字 → invalid', () => {
    const result = validatePasswordStrength('Abc1234')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('8文字以上')
  })

  it('P-04: 英数混在8文字 → valid', () => {
    const result = validatePasswordStrength('Abcde123')
    expect(result.valid).toBe(true)
  })

  it('P-03b: 英字のみ8文字 → invalid', () => {
    const result = validatePasswordStrength('Abcdefgh')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('数字')
  })

  it('P-03c: 数字のみ8文字 → invalid', () => {
    const result = validatePasswordStrength('12345678')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('英字')
  })

  it('P-04b: 英数混在20文字 → valid', () => {
    const result = validatePasswordStrength('SecurePassword12345!')
    expect(result.valid).toBe(true)
  })
})
