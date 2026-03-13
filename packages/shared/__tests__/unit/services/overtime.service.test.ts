import { describe, it, expect } from 'vitest'
import { getOvertimeWarningLevel, checkBreakTimeCompliance } from '../../../src/services/overtime.service'

describe('getOvertimeWarningLevel', () => {
  it('OT-01: 0分 → ok', () => {
    expect(getOvertimeWarningLevel(0)).toBe('ok')
  })

  it('OT-01b: 35h (2100分) → ok', () => {
    expect(getOvertimeWarningLevel(2100)).toBe('ok')
  })

  it('OT-02: 36h (2160分) → caution', () => {
    expect(getOvertimeWarningLevel(2160)).toBe('caution')
  })

  it('OT-03: 45h (2700分) → warning', () => {
    expect(getOvertimeWarningLevel(2700)).toBe('warning')
  })

  it('OT-04: 60h (3600分) → serious', () => {
    expect(getOvertimeWarningLevel(3600)).toBe('serious')
  })

  it('OT-05: 80h (4800分) → critical', () => {
    expect(getOvertimeWarningLevel(4800)).toBe('critical')
  })

  it('OT-06: 100h (6000分) → violation', () => {
    expect(getOvertimeWarningLevel(6000)).toBe('violation')
  })

  // 境界値テスト
  it('OT-07a: 2159分 → ok', () => {
    expect(getOvertimeWarningLevel(2159)).toBe('ok')
  })

  it('OT-07b: 2160分 → caution', () => {
    expect(getOvertimeWarningLevel(2160)).toBe('caution')
  })

  it('OT-07c: 2699分 → caution', () => {
    expect(getOvertimeWarningLevel(2699)).toBe('caution')
  })

  it('OT-07d: 2700分 → warning', () => {
    expect(getOvertimeWarningLevel(2700)).toBe('warning')
  })

  it('OT-07e: 3599分 → warning', () => {
    expect(getOvertimeWarningLevel(3599)).toBe('warning')
  })

  it('OT-07f: 4799分 → serious', () => {
    expect(getOvertimeWarningLevel(4799)).toBe('serious')
  })

  it('OT-07g: 5999分 → critical', () => {
    expect(getOvertimeWarningLevel(5999)).toBe('critical')
  })

  it('OT-07h: 負の値 → ok', () => {
    expect(getOvertimeWarningLevel(-100)).toBe('ok')
  })
})

describe('checkBreakTimeCompliance', () => {
  // 6時間以下: 休憩不要
  it('OT-08: 6h(360分), 0分休憩 → compliant', () => {
    const result = checkBreakTimeCompliance(360, 0)
    expect(result.isCompliant).toBe(true)
    expect(result.requiredMin).toBe(0)
  })

  it('OT-08b: 5h(300分), 0分休憩 → compliant', () => {
    const result = checkBreakTimeCompliance(300, 0)
    expect(result.isCompliant).toBe(true)
  })

  // 6時間超〜8時間以下: 45分以上必要
  it('OT-09: 7h(420分), 44分休憩 → non-compliant', () => {
    const result = checkBreakTimeCompliance(420, 44)
    expect(result.isCompliant).toBe(false)
    expect(result.requiredMin).toBe(45)
    expect(result.message).toContain('不足')
  })

  it('OT-10: 7h(420分), 45分休憩 → compliant', () => {
    const result = checkBreakTimeCompliance(420, 45)
    expect(result.isCompliant).toBe(true)
  })

  // 8時間超: 60分以上必要
  it('OT-11: 9h(540分), 59分休憩 → non-compliant', () => {
    const result = checkBreakTimeCompliance(540, 59)
    expect(result.isCompliant).toBe(false)
    expect(result.requiredMin).toBe(60)
  })

  it('OT-12: 9h(540分), 60分休憩 → compliant', () => {
    const result = checkBreakTimeCompliance(540, 60)
    expect(result.isCompliant).toBe(true)
  })

  // 境界値: 6h「超」なので360分ちょうどは不要
  it('OT-08c: 360分ちょうど, 0分休憩 → compliant（6h超ではない）', () => {
    const result = checkBreakTimeCompliance(360, 0)
    expect(result.isCompliant).toBe(true)
  })

  it('OT-09b: 361分, 0分休憩 → non-compliant（6h超）', () => {
    const result = checkBreakTimeCompliance(361, 0)
    expect(result.isCompliant).toBe(false)
    expect(result.requiredMin).toBe(45)
  })

  // 境界値: 8h超
  it('OT-11b: 480分ちょうど, 45分休憩 → compliant（8h超ではない）', () => {
    const result = checkBreakTimeCompliance(480, 45)
    expect(result.isCompliant).toBe(true)
  })

  it('OT-11c: 481分, 45分休憩 → non-compliant（8h超で60分必要）', () => {
    const result = checkBreakTimeCompliance(481, 45)
    expect(result.isCompliant).toBe(false)
    expect(result.requiredMin).toBe(60)
  })
})
