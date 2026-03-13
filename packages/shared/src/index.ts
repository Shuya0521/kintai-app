// ── Database ──────────────────────────────────────
export { prisma } from './db'

// ── Auth ──────────────────────────────────────────
export {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  createToken,
  createAccessToken,
  createRefreshToken,
  verifyToken,
  isAdminRole,
  isApproverRole,
  isExportRole,
  getApproverRoles,
  checkLockout,
  calculateLockout,
} from './auth'
export type { TokenPayload, LockoutResult } from './auth'

// ── Constants ────────────────────────────────────
export * from './constants'

// ── Types ────────────────────────────────────────
export * from './types'

// ── Validators ───────────────────────────────────
export * from './validators'

// ── Formatters ───────────────────────────────────
export * from './formatters'

// ── Services ───────────────────────────────────
export * from './services/leave.service'
export * from './services/overtime.service'

// ── Audit ──────────────────────────────────────
export * from './audit/logger'

// ── Excel ──────────────────────────────────────
// NOTE: Excel generator is imported directly from '@kintai/shared/src/excel/generator'
// to avoid loading exceljs in environments that don't need it (e.g., kintai-app client)
// export * from './excel/generator'

// ── JSON response helpers ────────────────────────
export function jsonOk(data: unknown, status = 200) {
  return Response.json(data, { status })
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}
