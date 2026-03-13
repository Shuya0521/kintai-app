import { vi } from 'vitest'
import path from 'path'
import { PrismaClient } from '@prisma/client'

// ── 1. Force test DB URL before any Prisma import ──
const testDbPath = path.resolve(__dirname, '../../../packages/shared/prisma/test.db')
const testDbUrl = `file:${testDbPath}`
process.env.DATABASE_URL = testDbUrl
process.env.JWT_SECRET = 'test-secret-key-for-testing-only'

// ── 2. Create a PrismaClient explicitly connected to test DB ──
const g = globalThis as any
if (g.prisma) {
  g.prisma.$disconnect?.()
  delete g.prisma
}
// Create new PrismaClient with explicit datasource URL
const testPrisma = new PrismaClient({
  datasourceUrl: testDbUrl,
})
g.prisma = testPrisma

// ── 3. Mock next/headers (used by getCurrentUser in lib/auth.ts) ──
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))
