import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  registerUserSchema,
  stampSchema,
  leaveRequestSchema,
  approvalActionSchema,
  exportExcelSchema,
} from '../../src/validators'

describe('loginSchema', () => {
  it('V-01: 有効データ → パース成功', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'pass1234' })
    expect(result.success).toBe(true)
  })

  it('V-02: email空 → エラー', () => {
    const result = loginSchema.safeParse({ email: '', password: 'pass1234' })
    expect(result.success).toBe(false)
  })

  it('V-02b: email不正形式 → エラー', () => {
    const result = loginSchema.safeParse({ email: 'notanemail', password: 'pass1234' })
    expect(result.success).toBe(false)
  })

  it('V-02c: password空 → エラー', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '' })
    expect(result.success).toBe(false)
  })
})

describe('stampSchema', () => {
  it('V-03: 有効action → 成功', () => {
    expect(stampSchema.safeParse({ action: 'checkIn' }).success).toBe(true)
    expect(stampSchema.safeParse({ action: 'checkOut' }).success).toBe(true)
    expect(stampSchema.safeParse({ action: 'breakStart' }).success).toBe(true)
    expect(stampSchema.safeParse({ action: 'breakEnd' }).success).toBe(true)
  })

  it('V-04: 無効action → エラー', () => {
    expect(stampSchema.safeParse({ action: 'invalid' }).success).toBe(false)
  })

  it('V-03b: workPlace省略 → デフォルト "office"', () => {
    const result = stampSchema.safeParse({ action: 'checkIn' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.workPlace).toBe('office')
    }
  })

  it('V-03c: workPlace "remote" → 成功', () => {
    const result = stampSchema.safeParse({ action: 'checkIn', workPlace: 'remote' })
    expect(result.success).toBe(true)
  })
})

describe('leaveRequestSchema', () => {
  it('V-05: 有効データ → 成功', () => {
    const result = leaveRequestSchema.safeParse({
      type: 'vacation',
      startDate: '2026-03-15',
      endDate: '2026-03-15',
    })
    expect(result.success).toBe(true)
  })

  it('V-05b: type "half-am" → 成功', () => {
    const result = leaveRequestSchema.safeParse({
      type: 'half-am',
      startDate: '2026-03-15',
      endDate: '2026-03-15',
    })
    expect(result.success).toBe(true)
  })

  it('V-05c: 日付形式不正 → エラー', () => {
    const result = leaveRequestSchema.safeParse({
      type: 'vacation',
      startDate: '2026/03/15',
      endDate: '2026-03-15',
    })
    expect(result.success).toBe(false)
  })

  it('V-05d: 無効なtype → エラー', () => {
    const result = leaveRequestSchema.safeParse({
      type: 'sick',
      startDate: '2026-03-15',
      endDate: '2026-03-15',
    })
    expect(result.success).toBe(false)
  })
})

describe('approvalActionSchema', () => {
  it('V-06: approve → 成功', () => {
    const result = approvalActionSchema.safeParse({ approvalId: 'abc', action: 'approve' })
    expect(result.success).toBe(true)
  })

  it('V-06b: reject → 成功', () => {
    const result = approvalActionSchema.safeParse({ approvalId: 'abc', action: 'reject', comment: '理由' })
    expect(result.success).toBe(true)
  })

  it('V-06c: 無効action → エラー', () => {
    const result = approvalActionSchema.safeParse({ approvalId: 'abc', action: 'cancel' })
    expect(result.success).toBe(false)
  })
})

describe('exportExcelSchema', () => {
  it('V-07: 有効範囲 → 成功', () => {
    expect(exportExcelSchema.safeParse({ year: 2026, month: 3 }).success).toBe(true)
  })

  it('V-07b: year下限 → 成功', () => {
    expect(exportExcelSchema.safeParse({ year: 2020, month: 1 }).success).toBe(true)
  })

  it('V-07c: year範囲外 → エラー', () => {
    expect(exportExcelSchema.safeParse({ year: 2019, month: 1 }).success).toBe(false)
    expect(exportExcelSchema.safeParse({ year: 2101, month: 1 }).success).toBe(false)
  })

  it('V-07d: month範囲外 → エラー', () => {
    expect(exportExcelSchema.safeParse({ year: 2026, month: 0 }).success).toBe(false)
    expect(exportExcelSchema.safeParse({ year: 2026, month: 13 }).success).toBe(false)
  })
})
