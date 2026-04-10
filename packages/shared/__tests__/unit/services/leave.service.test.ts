import { describe, it, expect } from 'vitest'
import { getGrantDaysByTenure, getYearsOfService } from '../../../src/services/leave.service'

describe('getGrantDaysByTenure', () => {
  it('LS-01: 0.5年 → 10日', () => {
    expect(getGrantDaysByTenure(0.5)).toBe(10)
  })

  it('LS-02: 1.5年 → 11日', () => {
    expect(getGrantDaysByTenure(1.5)).toBe(11)
  })

  it('LS-02b: 2.5年 → 12日', () => {
    expect(getGrantDaysByTenure(2.5)).toBe(12)
  })

  it('LS-02c: 3.5年 → 14日', () => {
    expect(getGrantDaysByTenure(3.5)).toBe(14)
  })

  it('LS-02d: 4.5年 → 16日', () => {
    expect(getGrantDaysByTenure(4.5)).toBe(16)
  })

  it('LS-02e: 5.5年 → 18日', () => {
    expect(getGrantDaysByTenure(5.5)).toBe(18)
  })

  it('LS-03: 6.5年 → 20日', () => {
    expect(getGrantDaysByTenure(6.5)).toBe(20)
  })

  it('LS-03b: 10年 → 20日（6.5年超は一律20日）', () => {
    expect(getGrantDaysByTenure(10)).toBe(20)
  })

  it('LS-04: 0.4年 → 2日（入社時付与）', () => {
    expect(getGrantDaysByTenure(0.4)).toBe(2)
  })

  it('LS-04b: 0年 → 2日（入社時付与）', () => {
    expect(getGrantDaysByTenure(0)).toBe(2)
  })

  // 境界値: 0.5年ちょうど
  it('LS-01b: 0.49年 → 2日（入社時付与、0.5年未満）', () => {
    expect(getGrantDaysByTenure(0.49)).toBe(2)
  })

  // 中間値: 2年以上 → 12日
  it('LS-02f: 2.0年 → 12日', () => {
    expect(getGrantDaysByTenure(2.0)).toBe(12)
  })
})

describe('getYearsOfService', () => {
  it('LS-05: 入社1年前 → ≈1.0', () => {
    const hireDate = new Date()
    hireDate.setFullYear(hireDate.getFullYear() - 1)
    const years = getYearsOfService(hireDate)
    expect(years).toBeGreaterThan(0.99)
    expect(years).toBeLessThan(1.01)
  })

  it('LS-05b: 入社6ヶ月前 → ≈0.5', () => {
    const hireDate = new Date()
    hireDate.setMonth(hireDate.getMonth() - 6)
    const years = getYearsOfService(hireDate)
    expect(years).toBeGreaterThan(0.48)
    expect(years).toBeLessThan(0.52)
  })

  it('LS-05c: 入社当日 → ≈0.0', () => {
    const years = getYearsOfService(new Date())
    expect(years).toBeGreaterThanOrEqual(0)
    expect(years).toBeLessThan(0.01)
  })

  it('LS-05d: 入社3年前 → ≈3.0', () => {
    const hireDate = new Date()
    hireDate.setFullYear(hireDate.getFullYear() - 3)
    const years = getYearsOfService(hireDate)
    expect(years).toBeGreaterThan(2.99)
    expect(years).toBeLessThan(3.01)
  })

  it('LS-05e: asOfパラメータを指定', () => {
    const hireDate = new Date('2024-01-01')
    const asOf = new Date('2026-01-01')
    const years = getYearsOfService(hireDate, asOf)
    expect(years).toBeGreaterThan(1.99)
    expect(years).toBeLessThan(2.01)
  })
})
