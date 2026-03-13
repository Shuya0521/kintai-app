// ── ユーザー型定義 ────────────────────────────────
export interface UserBase {
  id: string
  email: string
  employeeNumber: string
  lastName: string
  firstName: string
  lastNameKana: string
  firstNameKana: string
  phone: string
  avatarUrl: string
  role: string
  department: string
  workType: string
  hireDate: string
  paidLeaveBalance: number
  status: string
}

export interface UserPublic extends UserBase {
  createdAt: string
}

/** getCurrentUser で返る型 (passwordHash等を除外) */
export interface CurrentUser extends UserBase {
  mustChangePassword: boolean
}

// ── 勤怠型定義 ────────────────────────────────────
export interface AttendanceRecord {
  id: string
  userId: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  breakStartTime: string | null
  breakTotalMin: number
  workMin: number
  overtimeMin: number
  lateMin: number
  earlyLeaveMin: number
  isHolidayWork: boolean
  workPlace: string
  status: string
  note: string
}

// ── 休暇申請型定義 ────────────────────────────────
export interface LeaveRequestRecord {
  id: string
  userId: string
  type: string
  startDate: string
  endDate: string
  days: number
  reason: string
  status: string
  createdAt: string
  processedAt: string | null
  user?: { lastName: string; firstName: string; department: string }
}

// ── 承認型定義 ────────────────────────────────────
export interface ApprovalRecord {
  id: string
  leaveRequestId: string | null
  requestType: string
  requesterId: string
  approverId: string
  status: string
  comment: string
  delegatedFrom: string | null
  escalatedFrom: string | null
  createdAt: string
  processedAt: string | null
  requester?: { lastName: string; firstName: string; department: string; role: string }
  leaveRequest?: LeaveRequestRecord
}

// ── 残業記録型定義 ────────────────────────────────
export interface OvertimeInfo {
  userId: string
  year: number
  month: number
  totalMin: number
  warningTriggered: boolean
  limitExceeded: boolean
}

// ── 有給休暇付与型定義 ────────────────────────────
export interface PaidLeaveGrantInfo {
  id: string
  userId: string
  grantDate: string
  grantedDays: number
  usedDays: number
  carriedOverDays: number
  expiredDays: number
  expiresAt: string
}

// ── ダッシュボード型定義 ──────────────────────────
export interface DashboardStats {
  totalEmployees: number
  todayPresent: number
  todayRemote: number
  pendingApprovals: number
  overtimeWarnings: number
}

// ── API応答型定義 ────────────────────────────────
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

// ── Excel出力用型定義 ────────────────────────────
export interface MonthlyAttendanceSummary {
  employeeNumber: string
  name: string
  workDays: number
  specialLeaveDays: number
  paidLeaveDays: number
  absentDays: number
  lateEarlyMin: number
  overtimeMin: number
  remoteDays: number
  remoteAllowanceDays: number
  holidayWorkDays: number
  totalDays: number
  dailyRecords: DailyRecord[]
}

export interface DailyRecord {
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  breakMin: number
  workMin: number
  overtimeMin: number
  lateMin: number
  earlyLeaveMin: number
  workPlace: string
  status: string
  isHolidayWork: boolean
  note: string
}
