import { prisma, hashPassword, createToken } from '@kintai/shared'
import { cookies } from 'next/headers'
import { vi } from 'vitest'

export async function cleanDatabase() {
  // Delete in correct order (respect FK constraints)
  await prisma.auditLog.deleteMany()
  await prisma.approval.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.overtimeRecord.deleteMany()
  await prisma.paidLeaveGrant.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.session.deleteMany()
  await prisma.passwordHistory.deleteMany()
  await prisma.missedStampAlert.deleteMany()
  await prisma.approvalDelegation.deleteMany()
  await prisma.setting.deleteMany()
  await prisma.holiday.deleteMany()
  await prisma.user.deleteMany()
}

export async function createTestUser(overrides = {}) {
  const hash = await hashPassword('Test1234')
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      employeeNumber: String(100000 + Math.floor(Math.random() * 900000)),
      passwordHash: hash,
      lastName: 'テスト',
      firstName: '太郎',
      role: '社員',
      department: '営業部',
      hireDate: new Date('2024-01-01'),
      status: 'active',
      paidLeaveBalance: 20,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      ...overrides,
    },
  })
}

export function setAuthCookie(userId: string, role: string = '社員') {
  const token = createToken(userId, role)
  const cookiesMock = vi.mocked(cookies)
  cookiesMock.mockResolvedValue({
    get: vi.fn((name: string) =>
      name === 'kintai_token' ? { name, value: token } : undefined,
    ),
    set: vi.fn(),
    delete: vi.fn(),
  } as any)
}

export function clearAuthCookie() {
  const cookiesMock = vi.mocked(cookies)
  cookiesMock.mockResolvedValue({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  } as any)
}

export function createJsonRequest(url: string, body: any, method = 'POST') {
  return new Request(url, {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}
