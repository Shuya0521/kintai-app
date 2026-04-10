import { describe, it, expect, beforeEach } from 'vitest'
import { POST } from '../../app/api/requests/route'
import { cleanDatabase, createTestUser, setAuthCookie, createJsonRequest } from '../helpers'
import { prisma } from '@kintai/shared'

describe('POST /api/requests — バリデーション', () => {
  let userId: string

  beforeEach(async () => {
    await cleanDatabase()
    // 承認者（部長）を先に作成
    await createTestUser({
      email: 'bucho@example.com',
      role: '部長',
      department: '営業部',
    })
    // 申請者
    const user = await createTestUser({
      email: 'user@example.com',
      role: '社員',
      department: '営業部',
      paidLeaveBalance: 5,
    })
    userId = user.id
    setAuthCookie(userId, '社員')
  })

  it('RV-01: 無効な日付 "2026-02-30" → 400エラー', async () => {
    const req = createJsonRequest('http://localhost/api/requests', {
      type: 'vacation',
      startDate: '2026-02-30',
      endDate: '2026-02-30',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('無効な日付')
  })

  it('RV-02: 不正な形式 "26-1-1" → 400エラー', async () => {
    const req = createJsonRequest('http://localhost/api/requests', {
      type: 'vacation',
      startDate: '26-1-1',
      endDate: '26-1-1',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('YYYY-MM-DD')
  })

  it('RV-03: endDate < startDate → 400エラー', async () => {
    const req = createJsonRequest('http://localhost/api/requests', {
      type: 'vacation',
      startDate: '2026-04-15',
      endDate: '2026-04-10',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('終了日は開始日以降')
  })

  it('RV-04: 土日のみの日程（vacation） → 400「平日が含まれていません」', async () => {
    // 2026-04-11 = 土曜, 2026-04-12 = 日曜
    const req = createJsonRequest('http://localhost/api/requests', {
      type: 'vacation',
      startDate: '2026-04-11',
      endDate: '2026-04-12',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('平日が含まれていません')
  })

  it('RV-05: 有給残日数不足 → 400エラー', async () => {
    // balance=5 で 10日申請
    const req = createJsonRequest('http://localhost/api/requests', {
      type: 'vacation',
      startDate: '2026-04-13', // 月曜
      endDate: '2026-04-24', // 翌々金曜（10営業日）
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('有給残日数が不足')
  })

  it('RV-06: 無効な申請種別 → 400エラー', async () => {
    const req = createJsonRequest('http://localhost/api/requests', {
      type: 'invalid-type',
      startDate: '2026-04-13',
      endDate: '2026-04-13',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('無効な申請種別')
  })
})
