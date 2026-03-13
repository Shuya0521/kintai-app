import { z } from 'zod'
import { DEPARTMENTS, ROLES, WORK_TYPES, LEAVE_TYPES, WORK_PLACES } from './constants'

// ── 認証 ──────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
  newPassword: z.string().min(8, 'パスワードは8文字以上で入力してください'),
})

// ── ユーザー登録 ──────────────────────────────────
export const registerUserSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
  lastName: z.string().min(1, '姓を入力してください'),
  firstName: z.string().min(1, '名を入力してください'),
  lastNameKana: z.string().optional().default(''),
  firstNameKana: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  employeeNumber: z.string().min(1, '社員番号を入力してください'),
  role: z.string().refine((v) => (ROLES as readonly string[]).includes(v), '有効なロールを選択してください'),
  department: z.string().refine((v) => (DEPARTMENTS as readonly string[]).includes(v), '有効な部署を選択してください'),
  workType: z.string().refine((v) => (WORK_TYPES as readonly string[]).includes(v), '有効な勤務形態を選択してください').optional().default('正社員'),
  hireDate: z.string().min(1, '入社日を入力してください'),
})

// ── 打刻 ──────────────────────────────────────────
export const stampSchema = z.object({
  action: z.enum(['checkIn', 'checkOut', 'breakStart', 'breakEnd']),
  workPlace: z.enum(['office', 'remote']).optional().default('office'),
})

// ── 休暇申請 ──────────────────────────────────────
export const leaveRequestSchema = z.object({
  type: z.string().refine((v) => (LEAVE_TYPES as readonly string[]).includes(v), '有効な休暇タイプを選択してください'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD形式で入力してください'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD形式で入力してください'),
  reason: z.string().optional().default(''),
})

// ── 承認処理 ──────────────────────────────────────
export const approvalActionSchema = z.object({
  approvalId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
  comment: z.string().optional().default(''),
})

// ── Excel出力 ────────────────────────────────────
export const exportExcelSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
})

// ── 設定 ──────────────────────────────────────────
export const settingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
})
