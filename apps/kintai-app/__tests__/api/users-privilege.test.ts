import { describe, it, expect, beforeEach } from 'vitest'
import { PATCH } from '../../app/api/users/route'
import { cleanDatabase, createTestUser, setAuthCookie, createJsonRequest } from '../helpers'
import { prisma } from '@kintai/shared'

describe('PATCH /api/users — 従業員アプリ権限制限', () => {
  let adminId: string
  let targetId: string

  beforeEach(async () => {
    await cleanDatabase()
    const admin = await createTestUser({
      email: 'admin@example.com',
      role: '部長',
    })
    adminId = admin.id

    const target = await createTestUser({
      email: 'target@example.com',
      role: '社員',
      paidLeaveBalance: 20,
      status: 'active',
    })
    targetId = target.id
    setAuthCookie(adminId, '部長')
  })

  it('UP-01: role 変更を試みる → 無視される（DBに反映されない）', async () => {
    const req = createJsonRequest('http://localhost/api/users', {
      userId: targetId,
      role: 'システム管理者',
    }, 'PATCH')
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)

    const user = await prisma.user.findUnique({ where: { id: targetId } })
    expect(user!.role).toBe('社員') // 変更されていない
  })

  it('UP-02: paidLeaveBalance 変更を試みる → 無視される', async () => {
    const req = createJsonRequest('http://localhost/api/users', {
      userId: targetId,
      paidLeaveBalance: 100,
    }, 'PATCH')
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)

    const user = await prisma.user.findUnique({ where: { id: targetId } })
    expect(user!.paidLeaveBalance).toBe(20) // 変更されていない
  })

  it('UP-03: status 変更を試みる → 無視される', async () => {
    const req = createJsonRequest('http://localhost/api/users', {
      userId: targetId,
      status: 'retired',
    }, 'PATCH')
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)

    const user = await prisma.user.findUnique({ where: { id: targetId } })
    expect(user!.status).toBe('active') // 変更されていない
  })

  it('UP-04: lastName, phone はプロフィール情報として変更できる', async () => {
    const req = createJsonRequest('http://localhost/api/users', {
      userId: targetId,
      lastName: '変更後',
      phone: '090-1234-5678',
    }, 'PATCH')
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)

    const user = await prisma.user.findUnique({ where: { id: targetId } })
    expect(user!.lastName).toBe('変更後')
    expect(user!.phone).toBe('090-1234-5678')
  })
})
