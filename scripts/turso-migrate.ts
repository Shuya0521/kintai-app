/**
 * Turso マイグレーションスクリプト
 *
 * Turso Cloud にテーブル・インデックスを作成する。
 * Prisma migrate は Turso では直接使えないため、SQLを直接実行する。
 *
 * 使用方法:
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npx ts-node scripts/turso-migrate.ts
 */

import { createClient } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url || !authToken) {
  console.error('TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を環境変数に設定してください')
  process.exit(1)
}

const client = createClient({ url, authToken })

const statements = [
  // ── テーブル作成 ──
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastNameKana" TEXT NOT NULL DEFAULT '',
    "firstNameKana" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "avatarUrl" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "workType" TEXT NOT NULL DEFAULT '正社員',
    "hireDate" DATETIME NOT NULL,
    "paidLeaveBalance" REAL NOT NULL DEFAULT 20,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "checkInTime" DATETIME,
    "checkOutTime" DATETIME,
    "breakStartTime" DATETIME,
    "breakTotalMin" INTEGER NOT NULL DEFAULT 0,
    "workMin" INTEGER NOT NULL DEFAULT 0,
    "overtimeMin" INTEGER NOT NULL DEFAULT 0,
    "lateMin" INTEGER NOT NULL DEFAULT 0,
    "earlyLeaveMin" INTEGER NOT NULL DEFAULT 0,
    "isHolidayWork" BOOLEAN NOT NULL DEFAULT false,
    "workPlace" TEXT NOT NULL DEFAULT 'office',
    "status" TEXT NOT NULL DEFAULT 'working',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "days" REAL NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    CONSTRAINT "LeaveRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "Approval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leaveRequestId" TEXT,
    "requestType" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "comment" TEXT NOT NULL DEFAULT '',
    "delegatedFrom" TEXT,
    "escalatedFrom" TEXT,
    "escalatedAt" DATETIME,
    "dueAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    CONSTRAINT "Approval_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Approval_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Approval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "OvertimeRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalMin" INTEGER NOT NULL DEFAULT 0,
    "warningTriggered" BOOLEAN NOT NULL DEFAULT false,
    "limitExceeded" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OvertimeRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "PaidLeaveGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "grantDate" DATETIME NOT NULL,
    "grantedDays" REAL NOT NULL,
    "usedDays" REAL NOT NULL DEFAULT 0,
    "carriedOverDays" REAL NOT NULL DEFAULT 0,
    "expiredDays" REAL NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaidLeaveGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenFamily" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenFamily" TEXT NOT NULL,
    "deviceInfo" TEXT NOT NULL DEFAULT '',
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "PasswordHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "ApprovalDelegation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "delegatorId" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalDelegation_delegatorId_fkey" FOREIGN KEY ("delegatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalDelegation_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "MissedStampAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissedStampAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "Holiday" (
    "date" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
  )`,

  // Prisma migration tracking table
  `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "finished_at" DATETIME,
    "migration_name" TEXT NOT NULL,
    "logs" TEXT,
    "rolled_back_at" DATETIME,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  )`,

  // ── インデックス作成 ──
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_employeeNumber_key" ON "User"("employeeNumber")`,
  `CREATE INDEX IF NOT EXISTS "User_department_role_idx" ON "User"("department", "role")`,
  `CREATE INDEX IF NOT EXISTS "Attendance_userId_date_idx" ON "Attendance"("userId", "date")`,
  `CREATE INDEX IF NOT EXISTS "Attendance_date_idx" ON "Attendance"("date")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_userId_date_key" ON "Attendance"("userId", "date")`,
  `CREATE INDEX IF NOT EXISTS "LeaveRequest_userId_status_idx" ON "LeaveRequest"("userId", "status")`,
  `CREATE INDEX IF NOT EXISTS "LeaveRequest_startDate_endDate_idx" ON "LeaveRequest"("startDate", "endDate")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Approval_leaveRequestId_key" ON "Approval"("leaveRequestId")`,
  `CREATE INDEX IF NOT EXISTS "Approval_approverId_status_idx" ON "Approval"("approverId", "status")`,
  `CREATE INDEX IF NOT EXISTS "Approval_requestType_status_idx" ON "Approval"("requestType", "status")`,
  `CREATE INDEX IF NOT EXISTS "Approval_status_dueAt_idx" ON "Approval"("status", "dueAt")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "OvertimeRecord_userId_year_month_key" ON "OvertimeRecord"("userId", "year", "month")`,
  `CREATE INDEX IF NOT EXISTS "PaidLeaveGrant_userId_idx" ON "PaidLeaveGrant"("userId")`,
  `CREATE INDEX IF NOT EXISTS "PaidLeaveGrant_userId_expiresAt_idx" ON "PaidLeaveGrant"("userId", "expiresAt")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash")`,
  `CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId")`,
  `CREATE INDEX IF NOT EXISTS "RefreshToken_tokenFamily_idx" ON "RefreshToken"("tokenFamily")`,
  `CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId")`,
  `CREATE INDEX IF NOT EXISTS "PasswordHistory_userId_idx" ON "PasswordHistory"("userId")`,
  `CREATE INDEX IF NOT EXISTS "ApprovalDelegation_delegatorId_isActive_idx" ON "ApprovalDelegation"("delegatorId", "isActive")`,
  `CREATE INDEX IF NOT EXISTS "MissedStampAlert_userId_date_idx" ON "MissedStampAlert"("userId", "date")`,
  `CREATE INDEX IF NOT EXISTS "Holiday_year_idx" ON "Holiday"("year")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId")`,
]

async function main() {
  console.log('Turso マイグレーション開始...')
  console.log(`URL: ${url}`)

  for (const sql of statements) {
    const tableName = sql.match(/(?:TABLE|INDEX).*?"(\w+)"/)?.[1] || 'unknown'
    try {
      await client.execute(sql)
      console.log(`  [OK] ${tableName}`)
    } catch (err) {
      console.error(`  [NG] ${tableName}:`, err)
    }
  }

  console.log('\nマイグレーション完了!')
}

main().catch(console.error)
