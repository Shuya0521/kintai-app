import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, jsonOk, jsonError } from '@/lib/auth'
import { validatePasswordStrength } from '@kintai/shared'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { lastName, firstName, lastNameKana, firstNameKana, email, password, phone, department, position, workType, joinDate, employeeNumber } = body

    if (!lastName || !firstName || !email || !password || !department || !joinDate) {
      return jsonError('必須項目を入力してください', 400)
    }
    if (!employeeNumber) {
      return jsonError('社員番号を入力してください', 400)
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(joinDate) || isNaN(new Date(joinDate).getTime())) {
      return jsonError('入社日はYYYY-MM-DD形式の有効な日付を入力してください', 400)
    }

    // パスワード強度チェック
    const pwCheck = validatePasswordStrength(password)
    if (!pwCheck.valid) {
      return jsonError(pwCheck.message!, 400)
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return jsonError('このメールアドレスは既に登録されています', 409)
    }
    const existingEmpNo = await prisma.user.findUnique({ where: { employeeNumber } })
    if (existingEmpNo) {
      return jsonError('この社員番号は既に登録されています', 409)
    }

    const passwordHash = await hashPassword(password)

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        employeeNumber,
        lastName,
        firstName,
        lastNameKana: lastNameKana || '',
        firstNameKana: firstNameKana || '',
        phone: phone || '',
        role: '社員', // #1: ロール昇格防止 — 登録時は常に社員固定
        department,
        workType: workType || '正社員',
        hireDate: new Date(joinDate),
        status: 'pending',
        mustChangePassword: true,
        // initialPassword は廃止（平文パスワード保存の脆弱性対策）
      },
    })

    return jsonOk({ message: '登録申請を受け付けました。管理者の承認をお待ちください。' }, 201)
  } catch (error) {
    console.error('Register error:', error)
    return jsonError('登録に失敗しました', 500)
  }
}
