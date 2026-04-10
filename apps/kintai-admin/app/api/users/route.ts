import { NextRequest } from 'next/server'
import { prisma, jsonOk, jsonError, ROLES, DEPARTMENTS, WORK_TYPES } from '@kintai/shared'
import { getCurrentAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const me = await getCurrentAdmin()
  if (!me) return jsonError('権限がありません', 403)

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const department = url.searchParams.get('department')
  const search = url.searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (department) where.department = department
  if (search) {
    where.OR = [
      { lastName: { contains: search } },
      { firstName: { contains: search } },
      { email: { contains: search } },
    ]
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true, email: true, employeeNumber: true,
      lastName: true, firstName: true,
      lastNameKana: true, firstNameKana: true, phone: true,
      role: true, department: true, workType: true,
      hireDate: true, paidLeaveBalance: true, status: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return jsonOk({ users })
}

export async function PATCH(req: NextRequest) {
  const me = await getCurrentAdmin()
  if (!me) return jsonError('権限がありません', 403)

  try {
    const { userId, ...updates } = await req.json()
    if (!userId) return jsonError('ユーザーIDが必要です', 400)

    const allowedFields = ['lastName', 'firstName', 'lastNameKana', 'firstNameKana', 'phone', 'role', 'department', 'workType', 'paidLeaveBalance', 'status', 'employeeNumber']
    const data: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (updates[key] !== undefined) data[key] = updates[key]
    }

    if (data.role && !(ROLES as readonly string[]).includes(data.role as string)) {
      return jsonError('無効なロールです', 400)
    }
    if (data.department && !(DEPARTMENTS as readonly string[]).includes(data.department as string)) {
      return jsonError('無効な部署です', 400)
    }
    if (data.workType && !(WORK_TYPES as readonly string[]).includes(data.workType as string)) {
      return jsonError('無効な勤務形態です', 400)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, lastName: true, firstName: true, role: true, department: true, status: true },
    })

    return jsonOk({ user })
  } catch (error) {
    console.error('User update error:', error)
    return jsonError('更新に失敗しました', 500)
  }
}
