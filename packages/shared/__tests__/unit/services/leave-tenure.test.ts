import { describe, it, expect } from 'vitest'
import { getYearsOfService } from '../../../src/services/leave.service'

describe('getYearsOfService — うるう年エッジケース', () => {
  it('LT-01: 丁度1年後（非うるう年）→ 1.0以上（旧365.25除算バグの回帰テスト）', () => {
    // 2025-04-01 → 2026-04-01 = 丁度1年（365日）
    // 旧実装: 365 / 365.25 = 0.9993 で1年未満判定 → 付与日数が1段階下がるバグ
    const hireDate = new Date('2025-04-01')
    const asOf = new Date('2026-04-01')
    const years = getYearsOfService(hireDate, asOf)
    expect(years).toBeGreaterThanOrEqual(1.0)
    expect(years).toBeLessThan(1.01)
  })

  it('LT-01b: 丁度2年後 → 2.0以上', () => {
    const hireDate = new Date('2024-01-01')
    const asOf = new Date('2026-01-01')
    const years = getYearsOfService(hireDate, asOf)
    expect(years).toBeGreaterThanOrEqual(2.0)
    expect(years).toBeLessThan(2.01)
  })

  it('LT-02: うるう年2月29日入社 → 翌年3月1日で約1年', () => {
    // 2024-02-29 → 2025-03-01 で約1年（2025年に2/29はないため）
    const hireDate = new Date('2024-02-29')
    const asOf = new Date('2025-03-01')
    const years = getYearsOfService(hireDate, asOf)
    expect(years).toBeGreaterThanOrEqual(1.0)
    expect(years).toBeLessThan(1.02)
  })

  it('LT-03: 入社当日 → ほぼ0を返す', () => {
    const today = new Date('2026-04-10')
    const years = getYearsOfService(today, today)
    expect(years).toBeGreaterThanOrEqual(0)
    expect(years).toBeLessThan(0.01)
  })

  it('LT-04: 入社1日前 → 0.00x程度の小さい値', () => {
    const hireDate = new Date('2026-04-09')
    const asOf = new Date('2026-04-10')
    const years = getYearsOfService(hireDate, asOf)
    expect(years).toBeGreaterThan(0)
    expect(years).toBeLessThan(0.01)
  })
})
