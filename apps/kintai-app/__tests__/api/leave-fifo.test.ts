import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@kintai/shared'
import { deductPaidLeaveFIFO, expirePaidLeaves } from '@kintai/shared/src/services/leave.service'
import { cleanDatabase, createTestUser } from '../helpers'

describe('deductPaidLeaveFIFO', () => {
  let userId: string

  beforeEach(async () => {
    await cleanDatabase()
    const user = await createTestUser({ paidLeaveBalance: 12 })
    userId = user.id

    // 古い付与（残2日）
    await prisma.paidLeaveGrant.create({
      data: {
        userId,
        grantDate: new Date('2025-01-01'),
        grantedDays: 10,
        usedDays: 8,
        carriedOverDays: 0,
        expiredDays: 0,
        expiresAt: new Date('2027-01-01'),
      },
    })
    // 新しい付与（残10日）
    await prisma.paidLeaveGrant.create({
      data: {
        userId,
        grantDate: new Date('2026-01-01'),
        grantedDays: 10,
        usedDays: 0,
        carriedOverDays: 0,
        expiredDays: 0,
        expiresAt: new Date('2028-01-01'),
      },
    })
  })

  it('LF-01: FIFO — 古い付与から優先消化される', async () => {
    const result = await deductPaidLeaveFIFO(userId, 3)
    expect(result.success).toBe(true)
    expect(result.deducted).toBe(3)

    const grants = await prisma.paidLeaveGrant.findMany({
      where: { userId },
      orderBy: { expiresAt: 'asc' },
    })
    // 古い付与: usedDays 8→10 (残2日全部消化)
    expect(grants[0].usedDays).toBe(10)
    // 新しい付与: usedDays 0→1 (残り1日を消化)
    expect(grants[1].usedDays).toBe(1)
  })

  it('LF-02: 残日数不足 → success=false', async () => {
    const result = await deductPaidLeaveFIFO(userId, 20)
    expect(result.success).toBe(false)
    expect(result.error).toContain('不足')
  })

  it('LF-03: 0.5日（半休）消化が正しく動作する', async () => {
    const result = await deductPaidLeaveFIFO(userId, 0.5)
    expect(result.success).toBe(true)
    expect(result.deducted).toBe(0.5)

    const grants = await prisma.paidLeaveGrant.findMany({
      where: { userId },
      orderBy: { expiresAt: 'asc' },
    })
    // 古い付与から0.5日消化: usedDays 8→8.5
    expect(grants[0].usedDays).toBe(8.5)
  })

  it('LF-04: User.paidLeaveBalance が正確にデクリメントされる', async () => {
    await deductPaidLeaveFIFO(userId, 5)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    expect(user!.paidLeaveBalance).toBe(7) // 12 - 5
  })
})

describe('expirePaidLeaves', () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  it('LF-05: 期限切れ付与の残日数が正しく失効する', async () => {
    const user = await createTestUser({ paidLeaveBalance: 10 })

    await prisma.paidLeaveGrant.create({
      data: {
        userId: user.id,
        grantDate: new Date('2024-01-01'),
        grantedDays: 10,
        usedDays: 0,
        carriedOverDays: 0,
        expiredDays: 0,
        expiresAt: new Date('2025-12-31'), // 既に期限切れ
      },
    })

    const result = await expirePaidLeaves()
    expect(result.expired.length).toBe(1)
    expect(result.expired[0].expiredDays).toBe(10)

    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.paidLeaveBalance).toBe(0) // 10 - 10
  })

  it('LF-06: 一部使用済みの付与 → 残分のみ失効（二重失効しない）', async () => {
    const user = await createTestUser({ paidLeaveBalance: 7 })

    await prisma.paidLeaveGrant.create({
      data: {
        userId: user.id,
        grantDate: new Date('2024-01-01'),
        grantedDays: 10,
        usedDays: 3,
        carriedOverDays: 0,
        expiredDays: 0,
        expiresAt: new Date('2025-12-31'), // 既に期限切れ
      },
    })

    const result = await expirePaidLeaves()
    expect(result.expired.length).toBe(1)
    // remaining = 10 + 0 - 3 - 0 = 7（使用済み3日を除いた残り）
    expect(result.expired[0].expiredDays).toBe(7)

    const grant = await prisma.paidLeaveGrant.findFirst({ where: { userId: user.id } })
    expect(grant!.expiredDays).toBe(7)

    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.paidLeaveBalance).toBe(0) // 7 - 7
  })
})
