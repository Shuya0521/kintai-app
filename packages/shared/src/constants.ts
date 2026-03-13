// ── ロール定義 ────────────────────────────────────
export const ROLES = [
  'システム管理者', '取締役', '統括部長', '部長', '参事', '所長', '課長', '所長代理',
  '主事', '主査', 'リーダー', '社員',
] as const

export type Role = (typeof ROLES)[number]

/** 役職 (ROLESのエイリアス) */
export const POSITIONS = ROLES

/** ロール階層（昇順: 社員 → 統括部長） */
export const ROLE_HIERARCHY = [
  '社員', 'リーダー', '主査', '主事', '所長代理', '課長', '所長', '参事', '部長', '統括部長', '取締役', 'システム管理者',
] as const

/** 管理画面にアクセスできるロール（部長より上） */
export const ADMIN_ROLES: readonly string[] = ['システム管理者', '取締役', '統括部長']

/** 承認権限を持つロール */
export const APPROVER_ROLES: readonly string[] = ['システム管理者', '取締役', '統括部長', '部長']

/** Excel出力が可能なロール（部長から上） */
export const EXPORT_ROLES: readonly string[] = ['システム管理者', '取締役', '統括部長', '部長']

// ── 部署定義 ──────────────────────────────────────
export const DEPARTMENTS = ['営業部', '工事部', 'リフォーム推進部', '管理部'] as const
export type Department = (typeof DEPARTMENTS)[number]

// ── 勤務種別 ──────────────────────────────────────
export const WORK_TYPES = ['正社員', '契約社員', 'パート・アルバイト', '派遣社員', '業務委託'] as const
export type WorkType = (typeof WORK_TYPES)[number]

// ── 勤務場所 ──────────────────────────────────────
export const WORK_PLACES = ['office', 'remote'] as const
export type WorkPlace = (typeof WORK_PLACES)[number]

// ── 勤怠ステータス ────────────────────────────────
export const ATTENDANCE_STATUSES = ['working', 'breaking', 'done', 'holiday'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

// ── 休暇タイプ ────────────────────────────────────
export const LEAVE_TYPES = ['vacation', 'half-am', 'half-pm', 'special'] as const
export type LeaveType = (typeof LEAVE_TYPES)[number]

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  vacation: '有給休暇',
  'half-am': '午前半休',
  'half-pm': '午後半休',
  special: '特別休暇',
}

/** 休暇タイプごとの消化日数 */
export const LEAVE_TYPE_DAYS: Record<string, number> = {
  vacation: 1,
  'half-am': 0.5,
  'half-pm': 0.5,
  special: 0,
}

// ── 承認ステータス ────────────────────────────────
export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'escalated', 'cancelled'] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

// ── 労働時間定数 ──────────────────────────────────
export const STANDARD_WORK_HOURS = 8
export const STANDARD_WORK_MIN = STANDARD_WORK_HOURS * 60 // 480分
export const LEGAL_BREAK_THRESHOLD_6H = 6 * 60   // 6時間超 → 45分休憩
export const LEGAL_BREAK_THRESHOLD_8H = 8 * 60   // 8時間超 → 60分休憩
export const LEGAL_BREAK_MIN_45 = 45
export const LEGAL_BREAK_MIN_60 = 60

// ── 36協定上限 ────────────────────────────────────
export const OVERTIME_LIMIT_MONTHLY = 45 * 60     // 月45時間
export const OVERTIME_LIMIT_YEARLY = 360 * 60     // 年360時間
export const OVERTIME_LIMIT_ABSOLUTE = 100 * 60   // 月100時間未満（絶対的上限）
export const OVERTIME_AVG_LIMIT = 80 * 60         // 2-6ヶ月平均80時間

// ── 残業アラート閾値（分） ────────────────────────
export const OVERTIME_WARN_36H = 36 * 60
export const OVERTIME_WARN_45H = 45 * 60
export const OVERTIME_WARN_60H = 60 * 60
export const OVERTIME_WARN_80H = 80 * 60

// ── ロックアウト設定 ──────────────────────────────
export const LOCKOUT_ATTEMPTS_1 = 5    // 5回失敗 → 15分ロック
export const LOCKOUT_DURATION_1 = 15   // 分
export const LOCKOUT_ATTEMPTS_2 = 10   // 10回失敗 → 1時間ロック
export const LOCKOUT_DURATION_2 = 60   // 分
export const LOCKOUT_ATTEMPTS_3 = 15   // 15回失敗 → 管理者手動解除

// ── JWT設定 ──────────────────────────────────────
export const ACCESS_TOKEN_EXPIRY = '15m'
export const REFRESH_TOKEN_EXPIRY_DAYS = 7
export const MAX_SESSIONS_PER_USER = 3

// ── 有給休暇 法定付与日数テーブル ──────────────────
// index = 勤続年数（0.5年単位: 0=0.5年, 1=1.5年, ..., 6=6.5年以上）
export const PAID_LEAVE_GRANT_TABLE = [10, 11, 12, 14, 16, 18, 20] as const

// ── エスカレーション ──────────────────────────────
export const ESCALATION_TIMEOUT_HOURS = 72

// ── 有給年5日取得義務アラート ──────────────────────
export const ANNUAL_LEAVE_OBLIGATION_DAYS = 5
