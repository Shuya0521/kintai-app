import { describe, it, expect, beforeEach } from 'vitest'
import { POST } from '../../app/api/auth/register/route'
import { cleanDatabase, createTestUser, createJsonRequest } from '../helpers'
import { prisma } from '@kintai/shared'

const baseBody = {
  lastName: '田中',
  firstName: '太郎',
  email: `reg-${Date.now()}@example.com`,
  password: 'StrongPass123',
  department: '営業部',
  joinDate: '2026-04-01',
  employeeNumber: `R${Date.now()}`,
}

describe('POST /api/auth/register — バリデーション', () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  it('RG-01: 無効な入社日 "2026-02-30" → 400エラー', async () => {
    const req = createJsonRequest('http://localhost/api/auth/register', {
      ...baseBody,
      email: `rg01-${Date.now()}@example.com`,
      employeeNumber: `RG01${Date.now()}`,
      joinDate: '2026-02-30',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('無効')
  })

  it('RG-02: ロールは常に「社員」固定（bodyに管理者ロールを指定しても）', async () => {
    const email = `rg02-${Date.now()}@example.com`
    const empNo = `RG02${Date.now()}`
    const req = createJsonRequest('http://localhost/api/auth/register', {
      ...baseBody,
      email,
      employeeNumber: empNo,
      role: 'システム管理者', // 攻撃者が管理者ロールを指定
    })
    const res = await POST(req as any)
    expect(res.status).toBe(201)

    const user = await prisma.user.findUnique({ where: { email } })
    expect(user!.role).toBe('社員') // 社員固定
  })

  it('RG-03: 重複メール → 409エラー', async () => {
    const email = `dup-${Date.now()}@example.com`
    await createTestUser({ email })

    const req = createJsonRequest('http://localhost/api/auth/register', {
      ...baseBody,
      email,
      employeeNumber: `RG03${Date.now()}`,
    })
    const res = await POST(req as any)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('メールアドレス')
  })

  it('RG-04: 重複社員番号 → 409エラー', async () => {
    const empNo = `RG04${Date.now()}`
    await createTestUser({ employeeNumber: empNo })

    const req = createJsonRequest('http://localhost/api/auth/register', {
      ...baseBody,
      email: `rg04-${Date.now()}@example.com`,
      employeeNumber: empNo,
    })
    const res = await POST(req as any)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('社員番号')
  })
})
