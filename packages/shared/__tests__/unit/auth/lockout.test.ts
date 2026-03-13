import { describe, it, expect } from 'vitest'
import { checkLockout, calculateLockout } from '../../../src/auth/lockout'

describe('checkLockout', () => {
  it('L-01: ロック中（lockedUntil > now）→ locked: true', () => {
    const future = new Date(Date.now() + 10 * 60000) // 10分後
    const result = checkLockout(5, future)
    expect(result.locked).toBe(true)
    expect(result.message).toContain('分後に再試行')
  })

  it('L-02: ロック期限切れ → locked: false', () => {
    const past = new Date(Date.now() - 60000) // 1分前
    const result = checkLockout(5, past)
    expect(result.locked).toBe(false)
  })

  it('L-03: lockedUntil が null → locked: false', () => {
    const result = checkLockout(0, null)
    expect(result.locked).toBe(false)
  })

  it('L-01補: 残り時間メッセージが正しい', () => {
    const future = new Date(Date.now() + 5 * 60000) // 5分後
    const result = checkLockout(5, future)
    expect(result.locked).toBe(true)
    expect(result.lockedUntil).toEqual(future)
  })
})

describe('calculateLockout', () => {
  it('L-04: 4回失敗 → locked: false', () => {
    const result = calculateLockout(4)
    expect(result.locked).toBe(false)
  })

  it('L-05: 5回失敗 → 15分ロック', () => {
    const before = Date.now()
    const result = calculateLockout(5)
    expect(result.locked).toBe(true)
    expect(result.lockedUntil).toBeDefined()
    // 15分後 (±1秒の誤差許容)
    const expectedMin = before + 15 * 60000
    expect(result.lockedUntil!.getTime()).toBeGreaterThanOrEqual(expectedMin - 1000)
    expect(result.lockedUntil!.getTime()).toBeLessThanOrEqual(expectedMin + 1000)
  })

  it('L-06: 10回失敗 → 1時間ロック', () => {
    const before = Date.now()
    const result = calculateLockout(10)
    expect(result.locked).toBe(true)
    const expectedMin = before + 60 * 60000
    expect(result.lockedUntil!.getTime()).toBeGreaterThanOrEqual(expectedMin - 1000)
    expect(result.lockedUntil!.getTime()).toBeLessThanOrEqual(expectedMin + 1000)
  })

  it('L-07: 15回失敗 → 管理者手動解除', () => {
    const result = calculateLockout(15)
    expect(result.locked).toBe(true)
    expect(result.requiresAdminUnlock).toBe(true)
    expect(result.message).toContain('管理者')
  })

  it('L-08: 20回失敗（上限超え）→ requiresAdminUnlock維持', () => {
    const result = calculateLockout(20)
    expect(result.locked).toBe(true)
    expect(result.requiresAdminUnlock).toBe(true)
  })

  it('L-04b: 0回失敗 → locked: false', () => {
    const result = calculateLockout(0)
    expect(result.locked).toBe(false)
  })

  it('L-05b: 7回失敗（5〜9の間）→ 15分ロック', () => {
    const result = calculateLockout(7)
    expect(result.locked).toBe(true)
    expect(result.requiresAdminUnlock).toBeUndefined()
    expect(result.lockedUntil).toBeDefined()
  })
})
