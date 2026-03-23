/**
 * 勤怠時間再計算サービス
 *
 * 出退勤時刻と休憩時間から、勤務時間・残業時間・遅刻分数・早退分数を再計算する。
 * 管理者による直接修正、打刻修正申請の承認反映の両方で使用。
 */

import {
  STANDARD_WORK_MIN,
  LEGAL_BREAK_MIN_45,
  LEGAL_BREAK_MIN_60,
  LEGAL_BREAK_THRESHOLD_6H,
  LEGAL_BREAK_THRESHOLD_8H,
} from '../constants'

/** 始業時刻（09:00） */
const BUSINESS_START_HOUR = 9
const BUSINESS_START_MIN = 0

/** 終業時刻（18:00） */
const BUSINESS_END_HOUR = 18
const BUSINESS_END_MIN = 0

export interface AttendanceCalcInput {
  checkInTime: Date | null
  checkOutTime: Date | null
  breakTotalMin: number
  isHolidayWork: boolean
}

export interface AttendanceCalcResult {
  workMin: number
  overtimeMin: number
  lateMin: number
  earlyLeaveMin: number
}

/**
 * 出退勤時刻と休憩時間から勤務関連の分数を再計算する
 */
export function recalculateAttendanceMinutes(input: AttendanceCalcInput): AttendanceCalcResult {
  const { checkInTime, checkOutTime, breakTotalMin, isHolidayWork } = input

  if (!checkInTime || !checkOutTime) {
    return { workMin: 0, overtimeMin: 0, lateMin: 0, earlyLeaveMin: 0 }
  }

  // 総拘束時間（分）
  const totalMin = Math.max(0, Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 60000))

  // 法定休憩チェック（不足分があれば自動調整はしないが、計算に含める）
  const effectiveBreak = breakTotalMin

  // 実労働時間（分）
  const workMin = Math.max(0, totalMin - effectiveBreak)

  // 残業時間（所定労働時間超過分）
  const overtimeMin = Math.max(0, workMin - STANDARD_WORK_MIN)

  // 遅刻（始業時刻以降の出勤）
  let lateMin = 0
  if (!isHolidayWork) {
    const businessStart = new Date(checkInTime)
    businessStart.setHours(BUSINESS_START_HOUR, BUSINESS_START_MIN, 0, 0)
    if (checkInTime > businessStart) {
      lateMin = Math.floor((checkInTime.getTime() - businessStart.getTime()) / 60000)
    }
  }

  // 早退（終業時刻以前の退勤）
  let earlyLeaveMin = 0
  if (!isHolidayWork) {
    const businessEnd = new Date(checkOutTime)
    businessEnd.setHours(BUSINESS_END_HOUR, BUSINESS_END_MIN, 0, 0)
    if (checkOutTime < businessEnd) {
      earlyLeaveMin = Math.floor((businessEnd.getTime() - checkOutTime.getTime()) / 60000)
    }
  }

  return { workMin, overtimeMin, lateMin, earlyLeaveMin }
}
