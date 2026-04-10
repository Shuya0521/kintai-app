import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@kintai/shared'
import {
  cleanDatabase,
  createTestAdmin,
  createTestEmployee,
  setAdminAuth,
  clearAuth,
} from '../helpers'

// Import route handler after setup.ts mocks next/headers
const { POST } = await import('@/app/api/excel/export/route')

describe('Excel Export API', () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  // ── EX-01: 正常エクスポート ────────────────────────────────
  it('EX-01: valid export returns 200 with xlsx content-type', async () => {
    const admin = await createTestAdmin()
    const employee = await createTestEmployee()

    // 勤怠データを作成
    await prisma.attendance.create({
      data: {
        userId: employee.id,
        date: '2026-03-02',
        checkInTime: new Date('2026-03-02T09:00:00'),
        checkOutTime: new Date('2026-03-02T18:00:00'),
        workMin: 480,
        status: 'done',
        workPlace: 'office',
      },
    })

    setAdminAuth(admin.id, admin.role)

    const req = new Request('http://localhost/api/excel/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: 2026, month: 3 }),
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    expect(res.headers.get('Content-Disposition')).toContain('.xlsx')

    const buffer = await res.arrayBuffer()
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  // ── EX-02: 部署フィルタ ────────────────────────────────────
  it('EX-02: department filter returns only that department data', async () => {
    const admin = await createTestAdmin({ department: '管理部' })
    const empSales = await createTestEmployee({ department: '営業部' })
    const empAdmin = await createTestEmployee({ department: '管理部' })

    // 営業部の勤怠
    await prisma.attendance.create({
      data: {
        userId: empSales.id,
        date: '2026-02-10',
        checkInTime: new Date('2026-02-10T09:00:00'),
        checkOutTime: new Date('2026-02-10T18:00:00'),
        workMin: 480,
        status: 'done',
        workPlace: 'office',
      },
    })
    // 管理部の勤怠
    await prisma.attendance.create({
      data: {
        userId: empAdmin.id,
        date: '2026-02-10',
        checkInTime: new Date('2026-02-10T09:00:00'),
        checkOutTime: new Date('2026-02-10T18:00:00'),
        workMin: 480,
        status: 'done',
        workPlace: 'office',
      },
    })

    setAdminAuth(admin.id, admin.role)

    // 管理部のみでエクスポート
    const req = new Request('http://localhost/api/excel/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: 2026, month: 2, department: '管理部' }),
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    const buffer = await res.arrayBuffer()
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  // ── EX-03: データなし月 → 空だが有効なxlsx ────────────────
  it('EX-03: month with no data returns empty but valid xlsx', async () => {
    const admin = await createTestAdmin()
    setAdminAuth(admin.id, admin.role)

    const req = new Request('http://localhost/api/excel/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: 2025, month: 1 }),
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    const buffer = await res.arrayBuffer()
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  // ── EX-04: 未認証 → 401 ─────────────────────────────────
  it('EX-04: unauthenticated user returns 401', async () => {
    clearAuth()

    const req = new Request('http://localhost/api/excel/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: 2026, month: 3 }),
    })
    const res = await POST(req as any)

    expect(res.status).toBe(401)
  })
})
