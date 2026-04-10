import { describe, it, expect, beforeEach } from 'vitest'
import { prisma, LEAVE_TYPE_DAYS } from '@kintai/shared'
import {
  cleanDatabase,
  createTestAdmin,
  createTestEmployee,
  setAdminAuth,
  clearAuth,
} from '../helpers'

// Import route handlers after setup.ts mocks next/headers
const { GET, POST } = await import('@/app/api/approvals/route')

/** 承認用のLeaveRequest + Approval + PaidLeaveGrantを作成するヘルパー */
async function createLeaveWithApproval(opts: {
  employeeId: string
  adminId: string
  leaveType: string
  days?: number
}) {
  const { employeeId, adminId, leaveType, days } = opts
  // deductPaidLeaveFIFO に必要な PaidLeaveGrant レコード
  const existingGrant = await prisma.paidLeaveGrant.findFirst({ where: { userId: employeeId } })
  if (!existingGrant) {
    await prisma.paidLeaveGrant.create({
      data: {
        userId: employeeId,
        grantDate: new Date('2026-01-01'),
        grantedDays: 20,
        usedDays: 0,
        carriedOverDays: 0,
        expiredDays: 0,
        expiresAt: new Date('2028-01-01'),
      },
    })
  }
  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      userId: employeeId,
      type: leaveType,
      startDate: '2026-03-10',
      endDate: '2026-03-10',
      days: days ?? (LEAVE_TYPE_DAYS[leaveType] ?? 1),
      reason: 'テスト休暇申請',
      status: 'pending',
    },
  })
  const approval = await prisma.approval.create({
    data: {
      leaveRequestId: leaveRequest.id,
      requestType: 'leave',
      requesterId: employeeId,
      approverId: adminId,
      status: 'pending',
    },
  })
  return { leaveRequest, approval }
}

describe('Approvals API', () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  // ── AA-01: 有給休暇承認 → paidLeaveBalance -1.0 ──────────
  it('AA-01: approve vacation decrements paidLeaveBalance by 1.0', async () => {
    const admin = await createTestAdmin()
    const employee = await createTestEmployee({ paidLeaveBalance: 15 })
    const { approval } = await createLeaveWithApproval({
      employeeId: employee.id,
      adminId: admin.id,
      leaveType: 'vacation',
      days: 1,
    })
    setAdminAuth(admin.id, admin.role)

    const req = new Request('http://localhost/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId: approval.id, action: 'approve' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const updatedEmployee = await prisma.user.findUnique({ where: { id: employee.id } })
    expect(updatedEmployee!.paidLeaveBalance).toBe(14)

    const updatedApproval = await prisma.approval.findUnique({ where: { id: approval.id } })
    expect(updatedApproval!.status).toBe('approved')

    const updatedLeave = await prisma.leaveRequest.findUnique({ where: { id: approval.leaveRequestId! } })
    expect(updatedLeave!.status).toBe('approved')
  })

  // ── AA-02: 半休(午前)承認 → paidLeaveBalance -0.5 ─────────
  it('AA-02: approve half-am decrements paidLeaveBalance by 0.5', async () => {
    const admin = await createTestAdmin()
    const employee = await createTestEmployee({ paidLeaveBalance: 10 })
    const { approval } = await createLeaveWithApproval({
      employeeId: employee.id,
      adminId: admin.id,
      leaveType: 'half-am',
      days: 0.5,
    })
    setAdminAuth(admin.id, admin.role)

    const req = new Request('http://localhost/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId: approval.id, action: 'approve' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const updatedEmployee = await prisma.user.findUnique({ where: { id: employee.id } })
    expect(updatedEmployee!.paidLeaveBalance).toBe(9.5)
  })

  // ── AA-03: 特別休暇承認 → 残高変化なし ────────────────────
  it('AA-03: approve special leave does not change paidLeaveBalance', async () => {
    const admin = await createTestAdmin()
    const employee = await createTestEmployee({ paidLeaveBalance: 15 })
    const { approval } = await createLeaveWithApproval({
      employeeId: employee.id,
      adminId: admin.id,
      leaveType: 'special',
    })
    setAdminAuth(admin.id, admin.role)

    const req = new Request('http://localhost/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId: approval.id, action: 'approve' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const updatedEmployee = await prisma.user.findUnique({ where: { id: employee.id } })
    expect(updatedEmployee!.paidLeaveBalance).toBe(15)
  })

  // ── AA-04: 却下 → 残高変化なし ────────────────────────────
  it('AA-04: reject does not change paidLeaveBalance', async () => {
    const admin = await createTestAdmin()
    const employee = await createTestEmployee({ paidLeaveBalance: 15 })
    const { approval } = await createLeaveWithApproval({
      employeeId: employee.id,
      adminId: admin.id,
      leaveType: 'vacation',
      days: 1,
    })
    setAdminAuth(admin.id, admin.role)

    const req = new Request('http://localhost/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId: approval.id, action: 'reject', comment: '却下理由' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const updatedEmployee = await prisma.user.findUnique({ where: { id: employee.id } })
    expect(updatedEmployee!.paidLeaveBalance).toBe(15)

    const updatedApproval = await prisma.approval.findUnique({ where: { id: approval.id } })
    expect(updatedApproval!.status).toBe('rejected')
    expect(updatedApproval!.comment).toBe('却下理由')
  })

  // ── AA-05: 処理済み申請 → 400 ─────────────────────────────
  it('AA-05: already processed approval returns 400', async () => {
    const admin = await createTestAdmin()
    const employee = await createTestEmployee()
    const { approval } = await createLeaveWithApproval({
      employeeId: employee.id,
      adminId: admin.id,
      leaveType: 'vacation',
    })

    // Mark as already processed
    await prisma.approval.update({
      where: { id: approval.id },
      data: { status: 'approved', processedAt: new Date() },
    })
    setAdminAuth(admin.id, admin.role)

    const req = new Request('http://localhost/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId: approval.id, action: 'approve' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  // ── AA-06: GET pending approvals ───────────────────────────
  it('AA-06: GET returns pending approvals for admin', async () => {
    const admin = await createTestAdmin()
    const employee = await createTestEmployee()
    await createLeaveWithApproval({
      employeeId: employee.id,
      adminId: admin.id,
      leaveType: 'vacation',
    })
    await createLeaveWithApproval({
      employeeId: employee.id,
      adminId: admin.id,
      leaveType: 'half-am',
      days: 0.5,
    })
    setAdminAuth(admin.id, admin.role)

    const res = await GET()
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.approvals).toHaveLength(2)
    expect(data.approvals[0]).toHaveProperty('leaveRequest')
    expect(data.approvals[0]).toHaveProperty('requester')
  })

  // ── AA-07: 承認権限のないロール → 403 ─────────────────────
  it('AA-07: non-approver role returns 403', async () => {
    // 課長 is admin but NOT approver (APPROVER_ROLES = ['統括部長', '部長'])
    const admin = await createTestAdmin({ role: '課長' })
    setAdminAuth(admin.id, admin.role)

    const res = await GET()
    expect(res.status).toBe(403)
  })
})
