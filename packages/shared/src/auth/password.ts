import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** パスワードポリシーチェック（8文字以上、英数字混在） */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'パスワードは8文字以上で入力してください' }
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'パスワードには英字を含めてください' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'パスワードには数字を含めてください' }
  }
  return { valid: true }
}
