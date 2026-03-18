/**
 * メール通知サービス
 *
 * Nodemailerを使用してSMTP経由でメール送信。
 * Setting テーブルから SMTP 設定を取得して動的に構成。
 */
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { prisma } from '../db'

// ── SMTP設定の型 ──────────────────────────────────────
export interface SmtpConfig {
  host: string
  port: number
  secure: boolean // true for 465, false for other ports
  user: string
  pass: string
  fromAddress: string
  fromName: string
}

// ── メール送信結果 ────────────────────────────────────
interface SendResult {
  success: boolean
  messageId?: string
  error?: string
}

// ── Settingテーブルから SMTP設定を取得 ────────────────
async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const settings = await prisma.setting.findMany({
    where: { key: { startsWith: 'smtp' } },
  })
  const map = new Map(settings.map(s => [s.key, s.value]))

  const host = parseSettingValue(map.get('smtpHost'))
  const user = parseSettingValue(map.get('smtpUser'))
  if (!host || !user) return null

  return {
    host,
    port: Number(parseSettingValue(map.get('smtpPort')) || '587'),
    secure: parseSettingValue(map.get('smtpSecure')) === 'true',
    user,
    pass: parseSettingValue(map.get('smtpPass')) || '',
    fromAddress: parseSettingValue(map.get('smtpFromAddress')) || user,
    fromName: parseSettingValue(map.get('smtpFromName')) || '勤怠管理システム',
  }
}

function parseSettingValue(raw: string | undefined): string {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'string' ? parsed : String(parsed)
  } catch {
    return raw
  }
}

// ── トランスポーター作成 ──────────────────────────────
function createTransporter(config: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  })
}

// ── 通知タイプ ───────────────────────────────────────
export type NotificationType =
  | 'approvalRequest'   // 承認依頼
  | 'approvalResult'    // 承認結果
  | 'missedStamp'       // 打刻漏れ
  | 'overtimeWarning'   // 残業警告
  | 'test'              // テスト送信（常に送信可）

const NOTIFICATION_SETTING_KEYS: Record<string, string> = {
  approvalRequest: 'notifyApprovalRequest',
  approvalResult: 'notifyApprovalResult',
  missedStamp: 'notifyMissedStamp',
  overtimeWarning: 'notifyOvertimeWarning',
}

// ── メール送信（共通） ───────────────────────────────
export async function sendMail(
  to: string,
  subject: string,
  html: string,
  notificationType?: NotificationType,
): Promise<SendResult> {
  try {
    // メール通知（全体）が有効か確認
    const enabledSetting = await prisma.setting.findUnique({ where: { key: 'emailNotifications' } })
    if (enabledSetting && parseSettingValue(enabledSetting.value) === 'false') {
      return { success: false, error: 'メール通知が無効です' }
    }

    // 通知タイプ別のオン・オフ確認
    if (notificationType && notificationType !== 'test') {
      const settingKey = NOTIFICATION_SETTING_KEYS[notificationType]
      if (settingKey) {
        const typeSetting = await prisma.setting.findUnique({ where: { key: settingKey } })
        if (typeSetting && parseSettingValue(typeSetting.value) === 'false') {
          return { success: false, error: `${notificationType}通知が無効です` }
        }
      }
    }

    const config = await getSmtpConfig()
    if (!config) {
      return { success: false, error: 'SMTP設定が未構成です' }
    }

    const transporter = createTransporter(config)
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromAddress}>`,
      to,
      subject,
      html,
    })

    console.log(`[Email] Sent to ${to}: ${subject} (${info.messageId})`)
    return { success: true, messageId: info.messageId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Email] Failed to send to ${to}:`, msg)
    return { success: false, error: msg }
  }
}

// ── SMTP接続テスト ───────────────────────────────────
export async function testSmtpConnection(): Promise<SendResult> {
  try {
    const config = await getSmtpConfig()
    if (!config) {
      return { success: false, error: 'SMTP設定が未構成です' }
    }

    const transporter = createTransporter(config)
    await transporter.verify()
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// メールテンプレート（コトハ作成）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const baseStyle = `
  font-family: 'Helvetica Neue', Arial, 'Hiragino Sans', 'Noto Sans JP', sans-serif;
  max-width: 600px; margin: 0 auto; padding: 32px 24px;
  background: #f8fafc; color: #1e293b;
`
const headerStyle = `
  padding: 16px 24px; background: #0f172a; color: #38bdf8;
  font-size: 14px; font-weight: 600; border-radius: 8px 8px 0 0;
`
const cardStyle = `
  padding: 24px; background: #ffffff; border: 1px solid #e2e8f0;
  border-radius: 0 0 8px 8px;
`
const btnStyle = `
  display: inline-block; padding: 10px 24px; background: #38bdf8;
  color: #ffffff; text-decoration: none; border-radius: 6px;
  font-weight: 600; font-size: 14px;
`

function wrap(title: string, body: string): string {
  return `
    <div style="${baseStyle}">
      <div style="${headerStyle}">勤怠管理システム — ${title}</div>
      <div style="${cardStyle}">${body}</div>
      <div style="text-align:center;padding:16px;font-size:11px;color:#94a3b8;">
        このメールはシステムから自動送信されています。
      </div>
    </div>
  `
}

// ── 承認依頼メール ───────────────────────────────────
export function approvalRequestEmail(params: {
  approverName: string
  requesterName: string
  requestType: string
  details: string
  adminUrl: string
}): { subject: string; html: string } {
  const typeLabel: Record<string, string> = {
    leave: '休暇申請', stamp_correction: '打刻修正', overtime: '残業申請', user_registration: '新規登録',
  }
  return {
    subject: `【承認依頼】${params.requesterName}さんの${typeLabel[params.requestType] || params.requestType}`,
    html: wrap('承認依頼', `
      <p>${params.approverName} 様</p>
      <p>${params.requesterName}さんから<strong>${typeLabel[params.requestType] || params.requestType}</strong>の承認依頼があります。</p>
      <div style="padding:12px 16px;background:#f1f5f9;border-radius:6px;margin:16px 0;font-size:14px;">
        ${params.details}
      </div>
      <p style="margin-top:20px;">
        <a href="${params.adminUrl}/approvals" style="${btnStyle}">管理画面で確認する</a>
      </p>
    `),
  }
}

// ── 承認結果メール ───────────────────────────────────
export function approvalResultEmail(params: {
  requesterName: string
  requestType: string
  result: 'approved' | 'rejected'
  comment: string
  approverName: string
}): { subject: string; html: string } {
  const typeLabel: Record<string, string> = {
    leave: '休暇申請', stamp_correction: '打刻修正', overtime: '残業申請', user_registration: '新規登録',
  }
  const resultLabel = params.result === 'approved' ? '承認' : '却下'
  const resultColor = params.result === 'approved' ? '#22c55e' : '#ef4444'
  return {
    subject: `【${resultLabel}】${typeLabel[params.requestType] || params.requestType}が${resultLabel}されました`,
    html: wrap('承認結果', `
      <p>${params.requesterName} 様</p>
      <p>あなたの<strong>${typeLabel[params.requestType] || params.requestType}</strong>が
        <span style="color:${resultColor};font-weight:700;">${resultLabel}</span>されました。</p>
      <div style="padding:12px 16px;background:#f1f5f9;border-radius:6px;margin:16px 0;font-size:14px;">
        <strong>承認者:</strong> ${params.approverName}<br/>
        ${params.comment ? `<strong>コメント:</strong> ${params.comment}` : ''}
      </div>
    `),
  }
}

// ── 打刻漏れアラートメール ───────────────────────────
export function missedStampEmail(params: {
  employeeName: string
  date: string
  alertType: string
}): { subject: string; html: string } {
  const typeLabel: Record<string, string> = {
    no_checkout: '退勤打刻忘れ', no_record: '出勤記録なし',
  }
  return {
    subject: `【打刻確認】${params.date} の${typeLabel[params.alertType] || '打刻漏れ'}`,
    html: wrap('打刻確認', `
      <p>${params.employeeName} 様</p>
      <p><strong>${params.date}</strong> の勤怠に以下の確認事項があります：</p>
      <div style="padding:12px 16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;margin:16px 0;font-size:14px;">
        ${typeLabel[params.alertType] || params.alertType}
      </div>
      <p>お心当たりがある場合は、管理者までご連絡ください。</p>
    `),
  }
}

// ── 残業警告メール ───────────────────────────────────
export function overtimeWarningEmail(params: {
  employeeName: string
  month: string
  totalHours: number
  level: string
}): { subject: string; html: string } {
  const levelInfo: Record<string, { label: string; color: string }> = {
    caution: { label: '注意', color: '#f59e0b' },
    warning: { label: '警告（原則上限超過）', color: '#f97316' },
    serious: { label: '要改善', color: '#ef4444' },
    critical: { label: '産業医面談対象', color: '#dc2626' },
    violation: { label: '法令違反', color: '#991b1b' },
  }
  const info = levelInfo[params.level] || { label: params.level, color: '#f59e0b' }
  return {
    subject: `【残業${info.label}】${params.month} の残業時間: ${params.totalHours}時間`,
    html: wrap('残業警告', `
      <p>${params.employeeName} 様</p>
      <p><strong>${params.month}</strong> の残業時間について通知いたします。</p>
      <div style="padding:16px;background:#fef2f2;border-left:4px solid ${info.color};border-radius:4px;margin:16px 0;">
        <div style="font-size:24px;font-weight:700;color:${info.color};">${params.totalHours}時間</div>
        <div style="font-size:14px;color:${info.color};margin-top:4px;">レベル: ${info.label}</div>
      </div>
      <p>36協定に基づき、残業時間の削減にご協力をお願いいたします。</p>
    `),
  }
}

// ── テストメール ─────────────────────────────────────
export function testEmail(toName: string): { subject: string; html: string } {
  return {
    subject: '【テスト】勤怠管理システム メール送信テスト',
    html: wrap('テスト送信', `
      <p>${toName} 様</p>
      <p>メール送信テストが成功しました。</p>
      <p>この通知は、SMTP設定が正しく構成されていることを確認するためのテストメールです。</p>
      <p style="color:#22c55e;font-weight:600;">設定は正常です。</p>
    `),
  }
}
