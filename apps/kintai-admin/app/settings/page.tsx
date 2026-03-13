'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import { useCurrentUser } from '@/hooks/useCurrentUser'

type Tab = 'general' | 'workRules' | 'approval' | 'notification'

const TABS: { key: Tab; label: string }[] = [
  { key: 'general', label: '基本設定' },
  { key: 'workRules', label: '勤務ルール' },
  { key: 'approval', label: '承認設定' },
  { key: 'notification', label: '通知設定' },
]

const defaults = {
  companyName: '', fiscalYearStart: 4, timezone: 'Asia/Tokyo',
  businessHoursStart: '09:00', businessHoursEnd: '18:00',
  standardWorkHours: 8, gracePeriodMinutes: 5, overtimeThresholdHours: 8,
  monthlyOvertimeLimit: 45, yearlyOvertimeLimit: 360,
  breakMinutes: 60, breakAfterHours: 6,
  paidLeaveApproval: true, stampCorrectionApproval: true, overtimeApproval: false,
  approvalSlaDays: 3,
  emailNotifications: true, pendingApprovalReminder: true, overtimeWarningThreshold: 40,
}

type Settings = typeof defaults

const field = (label: string, input: React.ReactNode) => (
  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 500 }}>{label}</label>
    {input}
  </div>
)

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6, border: '1px solid var(--b)',
  background: 'var(--s2)', color: 'var(--text)', fontSize: 16, width: '100%',
}

const toggleStyle = (on: boolean): React.CSSProperties => ({
  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
  background: on ? 'var(--green)' : 'var(--s3)', position: 'relative', transition: 'background 0.2s',
})

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button type="button" onClick={() => onChange(!value)} style={toggleStyle(value)}>
    <span style={{
      position: 'absolute', top: 2, left: value ? 22 : 2, width: 20, height: 20,
      borderRadius: 10, background: '#fff', transition: 'left 0.2s',
    }} />
  </button>
)

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [tab, setTab] = useState<Tab>('general')
  const [settings, setSettings] = useState<Settings>(defaults)
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.settings) setSettings(s => ({ ...s, ...d.settings }))
    }).catch(() => {})
  }, [])

  const set = <K extends keyof Settings>(key: K, val: Settings[K]) =>
    setSettings(s => ({ ...s, [key]: val }))

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      setToast('保存しました')
      setTimeout(() => setToast(''), 2500)
    } catch { setToast('保存に失敗しました') }
    finally { setSaving(false) }
  }

  if (!user) return null

  const num = (key: keyof Settings) => (
    <input type="number" style={inputStyle} value={settings[key] as number}
      onChange={e => set(key, Number(e.target.value))} />
  )

  const panels: Record<Tab, React.ReactNode> = {
    general: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {field('会社名', <input style={inputStyle} value={settings.companyName}
          onChange={e => set('companyName', e.target.value)} />)}
        {field('年度開始月', <select style={inputStyle} value={settings.fiscalYearStart}
          onChange={e => set('fiscalYearStart', Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}月</option>)}
        </select>)}
        {field('タイムゾーン', <input style={inputStyle} value={settings.timezone}
          onChange={e => set('timezone', e.target.value)} />)}
        {field('始業時刻', <input type="time" style={inputStyle} value={settings.businessHoursStart}
          onChange={e => set('businessHoursStart', e.target.value)} />)}
        {field('終業時刻', <input type="time" style={inputStyle} value={settings.businessHoursEnd}
          onChange={e => set('businessHoursEnd', e.target.value)} />)}
      </div>
    ),
    workRules: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {field('所定労働時間 (時間)', num('standardWorkHours'))}
        {field('猶予時間 (分)', num('gracePeriodMinutes'))}
        {field('残業閾値 (時間)', num('overtimeThresholdHours'))}
        {field('月間残業上限 (時間)', num('monthlyOvertimeLimit'))}
        {field('年間残業上限 (時間)', num('yearlyOvertimeLimit'))}
        {field('休憩時間 (分)', num('breakMinutes'))}
        {field('休憩付与基準 (時間)', num('breakAfterHours'))}
      </div>
    ),
    approval: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {field('有給申請の承認', <Toggle value={settings.paidLeaveApproval}
          onChange={v => set('paidLeaveApproval', v)} />)}
        {field('打刻修正の承認', <Toggle value={settings.stampCorrectionApproval}
          onChange={v => set('stampCorrectionApproval', v)} />)}
        {field('残業申請の承認', <Toggle value={settings.overtimeApproval}
          onChange={v => set('overtimeApproval', v)} />)}
        {field('承認期限 (日)', num('approvalSlaDays'))}
      </div>
    ),
    notification: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {field('メール通知', <Toggle value={settings.emailNotifications}
          onChange={v => set('emailNotifications', v)} />)}
        {field('未承認リマインダー', <Toggle value={settings.pendingApprovalReminder}
          onChange={v => set('pendingApprovalReminder', v)} />)}
        {field('残業警告閾値 (時間)', num('overtimeWarningThreshold'))}
      </div>
    ),
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar userName={user.name} userRole={user.role} />
      <main style={{ flex: 1, padding: 24 }} className="md:ml-[220px] ml-0 pb-24 md:pb-6">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>設定</h1>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '7px 16px', borderRadius: 6, border: '1px solid var(--b)',
              background: tab === t.key ? 'var(--acc)' : 'var(--s2)',
              color: tab === t.key ? '#fff' : 'var(--t2)', cursor: 'pointer', fontSize: 13,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{
          background: 'var(--s1)', borderRadius: 12, padding: 20,
          border: '1px solid var(--b)', marginBottom: 20,
        }}>
          {panels[tab]}
        </div>

        <button onClick={save} disabled={saving} style={{
          padding: '10px 32px', borderRadius: 8, border: 'none',
          background: 'var(--acc)', color: '#fff', fontWeight: 600,
          fontSize: 14, cursor: 'pointer', opacity: saving ? 0.6 : 1,
        }}>
          {saving ? '保存中...' : '保存'}
        </button>

        {toast && (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500,
            background: toast.includes('失敗') ? 'var(--red)' : 'var(--green)', color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 999,
          }}>
            {toast}
          </div>
        )}
      </main>
    </div>
  )
}
