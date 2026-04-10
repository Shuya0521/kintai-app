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
} from '../constants'

/** 始業時刻（JST 09:00） */
const BUSINESS_START_HOUR_JST = 9
const BUSINESS_START_MIN = 0

/** 終業時刻（JST 18:00） */
const BUSINESS_END_HOUR_JST = 18
const BUSINESS_END_MIN = 0

/** JST時刻を取得するヘルパー */
function getJSTHours(d: Date): number {
  return (d.getUTCHours() + 9) % 24
}
function getJSTMinutes(d: Date): number {
  return d.getUTCMinutes()
}

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

  // #10: 法定休憩の最低時間を保証（入力値と法定値の大きい方を採用）
  const legalMinBreak = totalMin > 8 * 60 ? LEGAL_BREAK_MIN_60
                       : totalMin > 6 * 60 ? LEGAL_BREAK_MIN_45
                       : 0
  const effectiveBreak = Math.max(breakTotalMin, legalMinBreak)

  // 実労働時間（分）
  const workMin = Math.max(0, totalMin - effectiveBreak)

  // 残業時間（所定労働時間超過分）
  const overtimeMin = Math.max(0, workMin - STANDARD_WORK_MIN)

  // #7: 遅刻（JST基準で始業時刻以降の出勤）
  let lateMin = 0
  if (!isHolidayWork) {
    const inHour = getJSTHours(checkInTime)
    const inMin = getJSTMinutes(checkInTime)
    const inTotalMin = inHour * 60 + inMin
    const startTotalMin = BUSINESS_START_HOUR_JST * 60 + BUSINESS_START_MIN
    if (inTotalMin > startTotalMin) {
      lateMin = inTotalMin - startTotalMin
    }
  }

  // #7: 早退（JST基準で終業時刻以前の退勤）
  // 深夜退勤（日跨ぎ）を考慮: 残業している場合は早退ではない
  let earlyLeaveMin = 0
  if (!isHolidayWork && overtimeMin === 0) {
    const outHour = getJSTHours(checkOutTime)
    const outMin = getJSTMinutes(checkOutTime)
    const outTotalMin = outHour * 60 + outMin
    const endTotalMin = BUSINESS_END_HOUR_JST * 60 + BUSINESS_END_MIN
    // 深夜0時台（日跨ぎ退勤）は早退ではない
    const inHour = getJSTHours(checkInTime)
    const inTotalMin = inHour * 60 + getJSTMinutes(checkInTime)
    if (outTotalMin < endTotalMin && outTotalMin >= inTotalMin) {
      earlyLeaveMin = endTotalMin - outTotalMin
    }
  }

  return { workMin, overtimeMin, lateMin, earlyLeaveMin }
}
