import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { cleanDatabase, createTestUser, setAuthCookie, clearAuthCookie, createJsonRequest } from '../helpers'
import { prisma } from '@kintai/shared'

// Import route handlers after mocks are set up (setup.ts runs first)
import { POST, GET } from '../../app/api/requests/route'

describe('Leave Requests API', () => {
  beforeAll(async () => {
    await cleanDatabase()
  })

  beforeEach(async () => {
    await cleanDatabase()
  })

  it('RQ-01: valid vacation request by 社員 returns 201 with approval for 部長', async () => {
    const user = await createTestUser({
      email: 'shain@example.com',
      role: '社員',
      department: '営業部',
    })
    const approver = await createTestUser({
      email: 'bucho@example.com',
      role: '部長',
      department: '営業部',
    })

    setAuthCookie(user.id, user.role)
    const req = createJsonRequest('http://localhost:3000/api/requests', {
      type: 'vacation',
      startDate: '2026-04-01',
      endDate: '2026-04-01',
      reason: '私用のため',
    })
    const res = await POST(req as any)

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.request.type).toBe('vacation')
    expect(data.request.status).toBe('pending')

    // Verify approval record was created for the 部長
    const approval = await prisma.approval.findFirst({
      where: { leaveRequestId: data.request.id },
    })
    expect(approval).not.toBeNull()
    expect(approval!.approverId).toBe(approver.id)
    expect(approval!.status).toBe('pending')
  })

  it('RQ-02: half-day request returns 201 with approval', async () => {
    const user = await createTestUser({
      email: 'halfday@example.com',
      role: '社員',
      department: '営業部',
    })
    await createTestUser({
      email: 'bucho-half@example.com',
      role: '部長',
      department: '営業部',
    })

    setAuthCookie(user.id, user.role)
    const req = createJsonRequest('http://localhost:3000/api/requests', {
      type: 'half-am',
      startDate: '2026-04-02',
      endDate: '2026-04-02',
      reason: '午前半休',
    })
    const res = await POST(req as any)

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.request.type).toBe('half-am')
    expect(data.request.status).toBe('pending')

    // Verify approval was created
    const approval = await prisma.approval.findFirst({
      where: { leaveRequestId: data.request.id },
    })
    expect(approval).not.toBeNull()
    expect(approval!.status).toBe('pending')
  })

  it('RQ-03: missing required fields returns 400', async () => {
    const user = await createTestUser()
    setAuthCookie(user.id, user.role)

    // Missing type
    const req1 = createJsonRequest('http://localhost:3000/api/requests', {
      startDate: '2026-04-01',
      endDate: '2026-04-01',
    })
    const res1 = await POST(req1 as any)
    expect(res1.status).toBe(400)

    // Missing startDate
    setAuthCookie(user.id, user.role)
    const req2 = createJsonRequest('http://localhost:3000/api/requests', {
      type: 'vacation',
      endDate: '2026-04-01',
    })
    const res2 = await POST(req2 as any)
    expect(res2.status).toBe(400)

    // Missing endDate
    setAuthCookie(user.id, user.role)
    const req3 = createJsonRequest('http://localhost:3000/api/requests', {
      type: 'vacation',
      startDate: '2026-04-01',
    })
    const res3 = await POST(req3 as any)
    expect(res3.status).toBe(400)
  })

  it('RQ-04: 統括部長 request is auto-approved and balance decremented', async () => {
    const user = await createTestUser({
      email: 'tokatsu@example.com',
      role: '統括部長',
      department: '営業部',
      paidLeaveBalance: 20,
    })

    // deductPaidLeaveFIFO に必要な PaidLeaveGrant レコードを作成
    await prisma.paidLeaveGrant.create({
      data: {
        userId: user.id,
        grantDate: new Date('2026-01-01'),
        grantedDays: 20,
        usedDays: 0,
        carriedOverDays: 0,
        expiredDays: 0,
        expiresAt: new Date('2028-01-01'),
      },
    })

    setAuthCookie(user.id, user.role)
    const req = createJsonRequest('http://localhost:3000/api/requests', {
      type: 'vacation',
      startDate: '2026-04-01',
      endDate: '2026-04-01',
      reason: '私用',
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200) // 即承認は200
    const data = await res.json()

    // Verify auto-approved (統括部長 has no approver)
    expect(data.autoApproved).toBe(true)
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: data.request.id },
    })
    expect(leaveRequest!.status).toBe('approved')

    // Verify paid leave balance was decremented
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updatedUser!.paidLeaveBalance).toBe(19)
  })

  it('RQ-05: GET returns user leave requests list', async () => {
    const user = await createTestUser({ email: 'getlist@example.com' })

    // Create some leave requests for this user
    await prisma.leaveRequest.createMany({
      data: [
        {
          userId: user.id,
          type: 'vacation',
          startDate: '2026-03-01',
          endDate: '2026-03-01',
          reason: 'test1',
          status: 'pending',
        },
        {
          userId: user.id,
          type: 'half-am',
          startDate: '2026-03-02',
          endDate: '2026-03-02',
          reason: 'test2',
          status: 'approved',
        },
      ],
    })

    setAuthCookie(user.id, user.role)
    const req = new Request('http://localhost:3000/api/requests', {
      method: 'GET',
    })
    const res = await GET()

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.requests).toHaveLength(2)
    // Should be ordered by createdAt desc
    expect(data.requests[0].type).toBeDefined()
    expect(data.requests[1].type).toBeDefined()
  })

  it('RQ-00: unauthenticated request returns 401', async () => {
    clearAuthCookie()
    const req = createJsonRequest('http://localhost:3000/api/requests', {
      type: 'vacation',
      startDate: '2026-04-01',
      endDate: '2026-04-01',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })
})
