import {
  LOCKOUT_ATTEMPTS_1,
  LOCKOUT_DURATION_1,
  LOCKOUT_ATTEMPTS_2,
  LOCKOUT_DURATION_2,
  LOCKOUT_ATTEMPTS_3,
} from '../constants'

export interface LockoutResult {
  locked: boolean
  lockedUntil?: Date
  requiresAdminUnlock?: boolean
  message?: string
}

/** ログイン失敗回数に応じたロックアウト判定 */
export function checkLockout(failedAttempts: number, lockedUntil: Date | null): LockoutResult {
  // ロック中かチェック
  if (lockedUntil && lockedUntil > new Date()) {
    const remainingMin = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000)
    return {
      locked: true,
      lockedUntil,
      message: `アカウントがロックされています。${remainingMin}分後に再試行してください。`,
    }
  }

  return { locked: false }
}

/** 失敗回数からロック期限を計算 */
export function calculateLockout(failedAttempts: number): LockoutResult {
  if (failedAttempts >= LOCKOUT_ATTEMPTS_3) {
    return {
      locked: true,
      requiresAdminUnlock: true,
      message: 'アカウントがロックされました。管理者に連絡してください。',
    }
  }

  if (failedAttempts >= LOCKOUT_ATTEMPTS_2) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_2 * 60000)
    return {
      locked: true,
      lockedUntil,
      message: `ログイン試行回数が上限を超えました。${LOCKOUT_DURATION_2}分後に再試行してください。`,
    }
  }

  if (failedAttempts >= LOCKOUT_ATTEMPTS_1) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_1 * 60000)
    return {
      locked: true,
      lockedUntil,
      message: `ログイン試行回数が上限を超えました。${LOCKOUT_DURATION_1}分後に再試行してください。`,
    }
  }

  return { locked: false }
}
