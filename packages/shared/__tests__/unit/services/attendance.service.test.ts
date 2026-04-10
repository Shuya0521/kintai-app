import { describe, it, expect } from 'vitest'
import { recalculateAttendanceMinutes } from '../../../src/services/attendance.service'

/** JST 時刻を UTC Date に変換するヘルパー（テスト用） */
function jst(hour: number, min: number = 0): Date {
  // JST = UTC+9 なので、JST の hour 時 → UTC (hour-9) 時
  const d = new Date('2026-04-10T00:00:00Z')
  d.setUTCHours(hour - 9, min, 0, 0)
  return d
}

describe('recalculateAttendanceMinutes', () => {
  it('AT-01: 9:00出勤 18:00退勤 → 標準勤務（workMin=420, overtime=0, late=0, earlyLeave=0）', () => {
    const result = recalculateAttendanceMinutes({
      checkInTime: jst(9, 0),
      checkOutTime: jst(18, 0),
      breakTotalMin: 60,
      isHolidayWork: false,
    })
    // 9h - 60min break = 480min total, but workMin = 480 - 60 = 420? No:
    // totalMin = 18:00-9:00 = 540min, effectiveBreak = max(60, 60) = 60, workMin = 540-60 = 480
    // overtimeMin = 480 - 480 = 0
    expect(result.workMin).toBe(480)
    expect(result.overtimeMin).toBe(0)
    expect(result.lateMin).toBe(0)
    expect(result.earlyLeaveMin).toBe(0)
  })

  it('AT-02: 9:30出勤 → lateMin=30', () => {
    const result = recalculateAttendanceMinutes({
      checkInTime: jst(9, 30),
      checkOutTime: jst(18, 0),
      breakTotalMin: 60,
      isHolidayWork: false,
    })
    expect(result.lateMin).toBe(30)
  })

  it('AT-03: 17:00退勤（残業0） → earlyLeaveMin=60', () => {
    const result = recalculateAttendanceMinutes({
      checkInTime: jst(9, 0),
      checkOutTime: jst(17, 0),
      breakTotalMin: 60,
      isHolidayWork: false,
    })
    // totalMin = 480, workMin = 480-60 = 420, overtimeMin = 0
    // 18:00 - 17:00 = 60分早退
    expect(result.earlyLeaveMin).toBe(60)
    expect(result.overtimeMin).toBe(0)
  })

  it('AT-04: 9:00出勤 20:00退勤 → overtimeMin計算', () => {
    const result = recalculateAttendanceMinutes({
      checkInTime: jst(9, 0),
      checkOutTime: jst(20, 0),
      breakTotalMin: 60,
      isHolidayWork: false,
    })
    // totalMin = 660, effectiveBreak = max(60, 60) = 60, workMin = 600
    // overtimeMin = 600 - 480 = 120
    expect(result.workMin).toBe(600)
    expect(result.overtimeMin).toBe(120)
  })

  it('AT-05: 法定休憩 — 休憩0指定でも8h超なら60分が強制適用', () => {
    const result = recalculateAttendanceMinutes({
      checkInTime: jst(9, 0),
      checkOutTime: jst(18, 0),
      breakTotalMin: 0, // 0を指定しても法定60分が適用される
      isHolidayWork: false,
    })
    // totalMin = 540, effectiveBreak = max(0, 60) = 60, workMin = 480
    expect(result.workMin).toBe(480)
  })

  it('AT-05b: 法定休憩 — 6h超8h以下は45分が最低限', () => {
    const result = recalculateAttendanceMinutes({
      checkInTime: jst(9, 0),
      checkOutTime: jst(16, 0),
      breakTotalMin: 0,
      isHolidayWork: false,
    })
    // totalMin = 420 (7h), effectiveBreak = max(0, 45) = 45, workMin = 375
    expect(result.workMin).toBe(375)
  })

  it('AT-06: checkIn/checkOut が null → 全て0', () => {
    const result = recalculateAttendanceMinutes({
      checkInTime: null,
      checkOutTime: null,
      breakTotalMin: 60,
      isHolidayWork: false,
    })
    expect(result.workMin).toBe(0)
    expect(result.overtimeMin).toBe(0)
    expect(result.lateMin).toBe(0)
    expect(result.earlyLeaveMin).toBe(0)
  })

  it('AT-07: 休日出勤 → lateMin=0, earlyLeaveMin=0（遅刻・早退判定なし）', () => {
    const result = recalculateAttendanceMinutes({
      checkInTime: jst(10, 0), // 1時間遅い出勤
      checkOutTime: jst(16, 0), // 2時間早い退勤
      breakTotalMin: 45,
      isHolidayWork: true,
    })
    expect(result.lateMin).toBe(0)
    expect(result.earlyLeaveMin).toBe(0)
    // workMin は計算される
    expect(result.workMin).toBeGreaterThan(0)
  })
})
