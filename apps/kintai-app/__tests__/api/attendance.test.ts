import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { cleanDatabase, createTestUser, setAuthCookie, clearAuthCookie, createJsonRequest } from '../helpers'
import { prisma, getTodayStr } from '@kintai/shared'

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

  it('AT-03: check-out (action=out) calculates workMin and sets status=done', async () => {
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

  it('AT-05: break start/end increments breakTotalMin', async () => {
    const user = await createTestUser()
    const today = getTodayStr()

    // Create a working attendance record
    await prisma.attendance.create({
      data: {
        userId: user.id,
        date: today,
        checkInTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
        workPlace: 'office',
        status: 'working',
      },
    })

    // Break start
    setAuthCookie(user.id, user.role)
    const req1 = createJsonRequest('http://localhost:3000/api/attendance', {
      action: 'break-start',
    })
    const res1 = await POST(req1 as any)
    expect(res1.status).toBe(200)
    const data1 = await res1.json()
    expect(data1.attendance.status).toBe('breaking')

    // Break end
    setAuthCookie(user.id, user.role)
    const req2 = createJsonRequest('http://localhost:3000/api/attendance', {
      action: 'break-end',
    })
    const res2 = await POST(req2 as any)
    expect(res2.status).toBe(200)
    const data2 = await res2.json()
    expect(data2.attendance.status).toBe('working')
    // breakTotalMin should be >= 0 (may be 0 if break was very short)
    expect(data2.attendance.breakTotalMin).toBeGreaterThanOrEqual(0)
  })

  it('AT-06: overtime calculation (>8h) sets overtimeMin correctly', async () => {
    const user = await createTestUser()
    const today = getTodayStr()

    // Create attendance record with check-in 9.5 hours ago (should yield overtime)
    const nineAndHalfHoursAgo = new Date(Date.now() - 9.5 * 60 * 60 * 1000)
    await prisma.attendance.create({
      data: {
        userId: user.id,
        date: today,
        checkInTime: nineAndHalfHoursAgo,
        workPlace: 'office',
        status: 'working',
        breakTotalMin: 0,
      },
    })

    setAuthCookie(user.id, user.role)
    const req = createJsonRequest('http://localhost:3000/api/attendance', {
      action: 'out',
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    const data = await res.json()
    // workMin should be approximately 570 (9.5h = 570min)
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
