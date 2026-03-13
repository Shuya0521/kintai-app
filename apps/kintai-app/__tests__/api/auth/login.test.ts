import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { cleanDatabase, createTestUser, createJsonRequest } from '../../helpers'
import { prisma } from '@kintai/shared'

// Import route handler after mocks are set up (setup.ts runs first)
import { POST } from '../../../app/api/auth/login/route'

describe('Login API', () => {
  beforeAll(async () => {
    await cleanDatabase()
  })

  beforeEach(async () => {
    await cleanDatabase()
  })

  it('AL-01: valid login returns 200 with user data', async () => {
    await createTestUser({ email: 'test@example.com' })

    const req = createJsonRequest('http://localhost:3000/api/auth/login', {
      email: 'test@example.com',
      password: 'Test1234',
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.user.email).toBe('test@example.com')
    expect(data.user.role).toBe('社員')
    expect(data.user.name).toBe('テスト 太郎')
    expect(data.mustChangePassword).toBe(false)
  })

  it('AL-02: empty email/password returns 400', async () => {
    const req1 = createJsonRequest('http://localhost:3000/api/auth/login', {
      email: '',
      password: '',
    })
    const res1 = await POST(req1 as any)
    expect(res1.status).toBe(400)

    const req2 = createJsonRequest('http://localhost:3000/api/auth/login', {
      email: 'test@example.com',
      password: '',
    })
    const res2 = await POST(req2 as any)
    expect(res2.status).toBe(400)

    const req3 = createJsonRequest('http://localhost:3000/api/auth/login', {
      email: '',
      password: 'Test1234',
    })
    const res3 = await POST(req3 as any)
    expect(res3.status).toBe(400)
  })

  it('AL-03: non-existent email returns 401', async () => {
    const req = createJsonRequest('http://localhost:3000/api/auth/login', {
      email: 'nonexistent@example.com',
      password: 'Test1234',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('AL-04: wrong password returns 401 and increments failedAttempts', async () => {
    const user = await createTestUser({ email: 'wrong-pw@example.com' })

    const req = createJsonRequest('http://localhost:3000/api/auth/login', {
      email: 'wrong-pw@example.com',
      password: 'WrongPassword1',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)

    // Verify failedLoginAttempts was incremented
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.failedLoginAttempts).toBe(1)
  })

  it('AL-05: 5 failed attempts triggers lockout (423)', async () => {
    await createTestUser({
      email: 'lockout@example.com',
      failedLoginAttempts: 4,
    })

    // 5th failed attempt should trigger lockout
    const req = createJsonRequest('http://localhost:3000/api/auth/login', {
      email: 'lockout@example.com',
      password: 'WrongPassword1',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)

    // Verify user is now locked
    const user = await prisma.user.findFirst({ where: { email: 'lockout@example.com' } })
    expect(user!.failedLoginAttempts).toBe(5)
    expect(user!.lockedUntil).not.toBeNull()

    // Next attempt should return 423 (locked)
    const req2 = createJsonRequest('http://localhost:3000/api/auth/login', {
      email: 'lockout@example.com',
      password: 'Test1234',
    })
    const res2 = await POST(req2 as any)
    expect(res2.status).toBe(423)
  })

  it('AL-06: pending user returns 403', async () => {
    await createTestUser({
      email: 'pending@example.com',
      status: 'pending',
    })

    const req = createJsonRequest('http://localhost:3000/api/auth/login', {
      email: 'pending@example.com',
      password: 'Test1234',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(403)
  })

  it('AL-07: retired user returns 403', async () => {
    await createTestUser({
      email: 'retired@example.com',
      status: 'retired',
    })

    const req = createJsonRequest('http://localhost:3000/api/auth/login', {
      email: 'retired@example.com',
      password: 'Test1234',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(403)
  })
})
