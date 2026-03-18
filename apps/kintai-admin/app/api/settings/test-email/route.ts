import { jsonOk, jsonError } from '@kintai/shared'
import { sendMail, testEmail, testSmtpConnection } from '@kintai/shared/src/services/email.service'
import { getCurrentAdmin } from '@/lib/auth'

export async function POST() {
  const me = await getCurrentAdmin()
  if (!me) return jsonError('権限がありません', 403)

  // まずSMTP接続テスト
  const connResult = await testSmtpConnection()
  if (!connResult.success) {
    return jsonOk({ success: false, error: connResult.error })
  }

  // テストメール送信
  const { subject, html } = testEmail(`${me.lastName} ${me.firstName}`)
  const result = await sendMail(me.email, subject, html, 'test')

  return jsonOk(result)
}
