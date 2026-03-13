import { jsonError } from '@/lib/auth'

// クイックログイン機能は廃止
// 理由: 平文パスワードをAPIレスポンスに含めるセキュリティ上の致命的脆弱性
export async function GET() {
  return jsonError('この機能は無効化されています', 410)
}
