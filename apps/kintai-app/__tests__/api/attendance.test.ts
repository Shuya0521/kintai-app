import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { cleanDatabase, createTestUser, setAuthCookie, clearAuthCookie, createJsonRequest } from '../helpers'
import { prisma, getTodayStr, DEEMED_BREAK_MIN } from '@kintai/shared'

// Import route handlers after mocks are set up (setup.ts runs first)
import { POST, GET } from '../../app/api/attendance/route'

describe('Attendance API', () => {
  beforeAll(async () => {
    await cleanDatabase()
  })

  beforeEach(async () => {
    await cleanDatabase()
  })

  it('AT-01: check-in (action=in) creates record with status=working', async () => {
    const user = await createTestUser()
    setAuthCookie(user.id, user.role)

    const req = createJsonRequest('http://localhost:3000/api/attendance', {
      action: 'in',
      workPlace: 'office',
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.attendance.status).toBe('working')
    expect(data.attendance.userId).toBe(user.id)
    expect(data.attendance.date).toBe(getTodayStr())
    expect(data.attendance.workPlace).toBe('office')
  })

  it('AT-02: double check-in returns 400', async () => {
    const user = await createTestUser()
    setAuthCookie(user.id, user.role)

    // First check-in
    const req1 = createJsonRequest('http://localhost:3000/api/attendance', {
      action: 'in',
    })
    const res1 = await POST(req1 as any)
    expect(res1.status).toBe(200)

    // Second check-in should fail
    setAuthCookie(user.id, user.role) // re-set cookie mock for second call
    const req2 = createJsonRequest('http://localhost:3000/api/attendance', {
      action: 'in',
    })
    const res2 = await POST(req2 as any)
    expect(res2.status).toBe(400)
  })

  it('AT-03: check-out (action=out) applies deemed break deduction and sets status=done', async () => {
    const user = await createTestUser()
    const today = getTodayStr()

    // Create an attendance record with check-in time 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    await prisma.attendance.create({
      data: {
        userId: user.id,
        date: today,
        checkInTime: twoHoursAgo,
        workPlace: 'office',
        status: 'working',
      },
    })

    setAuthCookie(user.id, user.role)
    const req = createJsonRequest('http://localhost:3000/api/attendance', {
      action: 'out',
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.attendance.status).toBe('done')
    // みなし休憩控除: breakTotalMin は DEEMED_BREAK_MIN（60分）固定
    expect(data.attendance.breakTotalMin).toBe(DEEMED_BREAK_MIN)
    // 実働: 約120分 - 60分みなし = 約60分
    expect(data.attendance.workMin).toBeGreaterThan(0)
    expect(data.attendance.checkOutTime).not.toBeNull()
  })

  it('AT-04: check-out before check-in returns 400', async () => {
    const user = await createTestUser()
    setAuthCookie(user.id, user.role)

    const req = createJsonRequest('http://localhost:3000/api/attendance', {
      action: 'out',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('AT-05: break-start/break-end actions are no longer supported', async () => {
    const user = await createTestUser()
    const today = getTodayStr()

    await prisma.attendance.create({
      data: {
        userId: user.id,
        date: today,
        checkInTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
        workPlace: 'office',
        status: 'working',
      },
    })

    setAuthCookie(user.id, user.role)
    const req = createJsonRequest('http://localhost:3000/api/attendance', {
      action: 'break-start',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('AT-06: overtime calculation (>8h + deemed break) sets overtimeMin correctly', async () => {
    const user = await createTestUser()
    const today = getTodayStr()

    // Create attendance record with check-in 10 hours ago
    // After deemed break (60min), workMin ≈ 540min > 480min → overtime
    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000)
    await prisma.attendance.create({
      data: {
        userId: user.id,
        date: today,
        checkInTime: tenHoursAgo,
        workPlace: 'office',
        status: 'working',
      },
    })

    setAuthCookie(user.id, user.role)
    const req = createJsonRequest('http://localhost:3000/api/attendance', {
      action: 'out',
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    const data = await res.json()
    // みなし控除: workMin ≈ 600 - 60 = 540分 > 480分
    expect(data.attendance.breakTotalMin).toBe(DEEMED_BREAK_MIN)
    expect(data.attendance.workMin).toBeGreaterThan(480)
    // overtimeMin = workMin - 480 (standard 8h)
    expect(data.attendance.overtimeMin).toBe(data.attendance.workMin - 480)
    expect(data.attendance.overtimeMin).toBeGreaterThan(0)
    expect(data.attendance.status).toBe('done')

    // Verify overtime record was created
    const overtimeRecord = await prisma.overtimeRecord.findFirst({
      where: { userId: user.id },
    })
    expect(overtimeRecord).not.toBeNull()
    expect(overtimeRecord!.totalMin).toBe(data.attendance.overtimeMin)
  })

  it('AT-00: unauthenticated request returns 401', async () => {
    clearAuthCookie()
    const req = createJsonRequest('http://localhost:3000/api/attendance', {
      action: 'in',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })
})
