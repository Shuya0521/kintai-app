/**
 * 初期データ投入スクリプト
 * 実行: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed.ts
 */
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'

function createPrisma() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN
  if (tursoUrl && tursoToken) {
    const libsql = createClient({ url: tursoUrl, authToken: tursoToken })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter } as any)
  }
  return new PrismaClient()
}

const prisma = createPrisma()

async function main() {
  console.log('🌱 初期データを投入しています...')

  // ── 既存ユーザーをリセット ─────────────────────
  await prisma.user.deleteMany()
  console.log('  🗑️ 既存ユーザーを削除しました')

  // ── 管理者アカウント（小田原さん）──────────────
  const adminHash = await bcrypt.hash('password123', 12)
  const admin = await prisma.user.create({
    data: {
      email: 'kawamura@company.example.com',
      employeeNumber: '000521',
      passwordHash: adminHash,
      lastName: '河村',
      firstName: '佳徳',
      lastNameKana: 'カワムラ',
      firstNameKana: 'ヨシノリ',
      role: '取締役',
      department: '管理部',
      workType: '正社員',
      hireDate: new Date('2020-04-01'),
      paidLeaveBalance: 20,
      status: 'active',
      mustChangePassword: false,
    },
  })
  console.log(`  ✅ 管理者: ${admin.lastName} ${admin.firstName} (${admin.email})`)

  // ── サンプル社員 ────────────────────────────────
  const employees = [
    { email: 'suzuki@company.example.com', empNo: '000101', lastName: '鈴木', firstName: '英俊', kanaL: 'スズキ', kanaF: 'ヒデトシ', role: '部長', dept: '工事部', hire: '2019-04-01' },
    { email: 'kawata@company.example.com', empNo: '000201', lastName: '河田', firstName: '匡広', kanaL: 'カワタ', kanaF: 'マサヒロ', role: '部長', dept: '管理部', hire: '2020-10-01' },
    { email: 'kushima@company.example.com', empNo: '000102', lastName: '串間', firstName: '絵理', kanaL: 'クシマ', kanaF: 'エリ', role: '課長', dept: '管理部', hire: '2022-04-01' },
    { email: 'kasama@company.example.com', empNo: '000301', lastName: '笠間', firstName: '成央', kanaL: 'カサマ', kanaF: 'ナリオ', role: 'リーダー', dept: '管理部', hire: '2021-07-01' },
    { email: 'odawara@company.example.com', empNo: '000202', lastName: '小田原', firstName: '秀哉', kanaL: 'オダワラ', kanaF: 'ヒデヤ', role: 'システム管理者', dept: '工事部', hire: '2023-04-01' },
  ]

  const empHash = await bcrypt.hash('password123', 12)

  for (const emp of employees) {
    const user = await prisma.user.create({
      data: {
        email: emp.email,
        employeeNumber: emp.empNo,
        passwordHash: empHash,
        lastName: emp.lastName,
        firstName: emp.firstName,
        lastNameKana: emp.kanaL,
        firstNameKana: emp.kanaF,
        role: emp.role,
        department: emp.dept,
        workType: '正社員',
        hireDate: new Date(emp.hire),
        paidLeaveBalance: 20,
        status: 'active',
        mustChangePassword: false,
      },
    })
    console.log(`  ✅ 社員: ${user.lastName} ${user.firstName} (${user.email})`)
  }

  // ── 初期設定 ────────────────────────────────────
  const defaultSettings = [
    { key: 'companyName', value: '"株式会社サンプル"' },
    { key: 'businessHoursStart', value: '"09:00"' },
    { key: 'businessHoursEnd', value: '"18:00"' },
    { key: 'standardWorkHours', value: '8' },
    { key: 'overtimeThreshold', value: '45' },
    { key: 'monthlyLimit', value: '60' },
    { key: 'yearlyLimit', value: '720' },
  ]

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, value: s.value },
    })
  }
  console.log('  ✅ 初期設定を投入しました')

  console.log('\n🎉 初期データの投入が完了しました！')
  console.log('\n📋 ログインアカウント:')
  console.log('   統括部長: kawamura@company.example.com / password123')
  console.log('   部長:     suzuki@company.example.com / password123')
  console.log('            （他の社員も全て password123）')
}

main()
  .catch(e => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
