import { describe, it, expect } from 'vitest'
import {
  formatMinToHHMM,
  formatMinToHumanReadable,
  formatTimeFromISO,
  formatDateJP,
  formatDateFullJP,
  getTodayStr,
  formatUserName,
} from '../../src/formatters'

describe('formatMinToHHMM', () => {
  it('F-01a: 0 → "0:00"', () => {
    expect(formatMinToHHMM(0)).toBe('0:00')
  })

  it('F-01b: 90 → "1:30"', () => {
    expect(formatMinToHHMM(90)).toBe('1:30')
  })

  it('F-01c: 480 → "8:00"', () => {
    expect(formatMinToHHMM(480)).toBe('8:00')
  })

  it('F-01d: -10 → "0:00"（負の値）', () => {
    expect(formatMinToHHMM(-10)).toBe('0:00')
  })

  it('F-01e: 61 → "1:01"', () => {
    expect(formatMinToHHMM(61)).toBe('1:01')
  })
})

describe('formatMinToHumanReadable', () => {
  it('0 → "0m"', () => {
    expect(formatMinToHumanReadable(0)).toBe('0m')
  })

  it('30 → "30m"', () => {
    expect(formatMinToHumanReadable(30)).toBe('30m')
  })

  it('60 → "1h"', () => {
    expect(formatMinToHumanReadable(60)).toBe('1h')
  })

  it('90 → "1h 30m"', () => {
    expect(formatMinToHumanReadable(90)).toBe('1h 30m')
  })
})

describe('formatTimeFromISO', () => {
  it('F-02: null → "--"', () => {
    expect(formatTimeFromISO(null)).toBe('--')
  })

  it('F-02b: ISO文字列 → "HH:MM"', () => {
    // 2026-03-12T09:05:00 のローカル時間で検証
    const d = new Date(2026, 2, 12, 9, 5, 0)
    const result = formatTimeFromISO(d.toISOString())
    expect(result).toBe('09:05')
  })
})

describe('formatDateJP', () => {
  it('F-03: "2026-03-12" → 含む "3月12日"', () => {
    const result = formatDateJP('2026-03-12')
    expect(result).toContain('3月12日')
  })
})

describe('formatDateFullJP', () => {
  it('F-03b: "2026-03-12" → 含む "2026年3月12日"', () => {
    const result = formatDateFullJP('2026-03-12')
    expect(result).toContain('2026年')
    expect(result).toContain('3月12日')
  })
})

describe('getTodayStr', () => {
  it('F-04: YYYY-MM-DD形式', () => {
    const result = getTodayStr()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('formatUserName', () => {
  it('F-05: 姓名結合', () => {
    expect(formatUserName({ lastName: '小田原', firstName: '秀哉' })).toBe('小田原 秀哉')
  })
})
