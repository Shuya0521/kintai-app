'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { apiGet, apiPost } from '@/lib/api'

interface RequestUser {
  name: string
  role: string
  paidLeaveBalance: number
}

interface LeaveHistoryItem {
  id: string
  type: string
  startDate: string
  endDate: string
  reason: string
  status: string
  createdAt: string
}

const TYPES = [
  { icon: '🌴', name: '有給休暇（全日）', desc: '1日消費' },
  { icon: '🌅', name: '午前半休',         desc: '0.5日消費' },
  { icon: '🌇', name: '午後半休',         desc: '0.5日消費' },
  { icon: '⭐', name: '特別休暇',         desc: '慶弔事由' },
]

export default function RequestsPage() {
  const router = useRouter()
  const [user,     setUser]     = useState<RequestUser | null>(null)
  const [selected, setSelected] = useState(0)
  const [startDate,setStartDate]= useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [endDate,  setEndDate]  = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [reason,   setReason]   = useState('')
  const [toast,    setToast]    = useState('')
  const [history,  setHistory]  = useState<LeaveHistoryItem[]>([])
  const [paidLeave, setPaidLeave] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiGet('/api/auth/me').then(data => {
      setUser(data.user)
      setPaidLeave(data.user.paidLeaveBalance ?? 0)
      try { sessionStorage.setItem('user', JSON.stringify(data.user)) } catch { /* private browsing */ }
    }).catch(() => router.push('/login'))
  }, [router])

  const loadHistory = () => {
    apiGet('/api/requests').then(data => setHistory(data.requests || [])).catch(() => {})
  }

  useEffect(() => { loadHistory() }, [])

  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const showToastMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg)
    setToastType(type)
    setTimeout(() => setToast(''), 2800)
  }

  if (!user) return null

  return (
    <div style={S.app}>
      <Sidebar active="requests" />
      <main style={S.main}>
        <div style={S.page}>
          <div style={S.pageTitle}>申請</div>
          <div style={S.pageSub}>
            有給残日数: <span style={{ color: 'var(--green)', fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{paidLeave} 日</span>
          </div>

          <div style={S.card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>休暇の種別を選択</div>

            {/* 種別選択 */}
            <div style={S.typeGrid}>
              {TYPES.map((t, i) => {
                const isSel = selected === i
                return (
                  <div
                    key={i}
                    style={{ ...S.typeCard, ...(isSel ? S.typeCardSelected : {}) }}
                    onClick={() => { setSelected(i); if (i === 1 || i === 2) setEndDate(startDate) }}
                  >
                    {isSel && (
                      <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#0a0f1e', fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>
                      </div>
                    )}
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: isSel ? '#38bdf8' : 'var(--text)' }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>{t.desc}</div>
                  </div>
                )
              })}
            </div>

            {/* 日付 */}
            <div style={S.formRow}>
              <div>
                <label style={S.label}>開始日 *</label>
                <input style={S.input} type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setEndDate(e.target.value) }} />
              </div>
              {selected !== 1 && selected !== 2 && (
              <div>
                <label style={S.label}>終了日 *</label>
                <input style={S.input} type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              )}
            </div>

            {/* 理由 */}
            <label style={S.label}>申請理由（任意）</label>
            <textarea
              style={{ ...S.input, resize: 'vertical' }}
              rows={3}
              placeholder="例: 私用のため"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />

            {/* サマリ */}
            <div style={S.summary}>
              {TYPES[selected].icon} {TYPES[selected].name} → 残日数: <strong style={{ color: 'var(--green)' }}>{paidLeave}日</strong> → <strong style={{ color: 'var(--acc)' }}>{selected === 0 ? paidLeave - 1 : selected <= 2 ? paidLeave - 0.5 : paidLeave}日</strong>
            </div>

            <button style={{ ...S.submitBtn, opacity: submitting ? 0.7 : 1 }} disabled={submitting} onClick={async () => {
              // --- バリデーション ---
              const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d).getTime())
              if (!isValidDate(startDate)) {
                showToastMsg('開始日が正しくありません', 'error'); return
              }
              const isHalf = selected === 1 || selected === 2
              if (!isHalf && !isValidDate(endDate)) {
                showToastMsg('終了日が正しくありません', 'error'); return
              }
              if (!isHalf && endDate < startDate) {
                showToastMsg('終了日は開始日以降を指定してください', 'error'); return
              }
              // ---------------------
              setSubmitting(true)
              try {
                await apiPost('/api/requests', {
                  type: ['vacation', 'half-am', 'half-pm', 'special'][selected],
                  startDate,
                  endDate: isHalf ? startDate : endDate,
                  reason,
                })
                showToastMsg('有給申請を送信しました。上長の承認をお待ちください', 'success')
                loadHistory()
                // refresh paid leave balance
                apiGet('/api/auth/me').then(d => setPaidLeave(d.user?.paidLeaveBalance ?? 0)).catch(() => {})
                setReason('')
              } catch (e: unknown) {
                showToastMsg(e instanceof Error ? e.message : '申請に失敗しました', 'error')
              } finally {
                setSubmitting(false)
              }
            }}>
              {submitting ? '送信中...' : '申請する →'}
            </button>
          </div>

          {/* 申請履歴 */}
          {history.length > 0 && (
            <div style={{ ...S.card, marginTop: 20, maxWidth: 560 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>申請履歴</div>
              {history.map((h) => {
                const typeLabel: Record<string, string> = { vacation: '有給休暇', 'half-am': '午前半休', 'half-pm': '午後半休', special: '特別休暇' }
                const statusLabel: Record<string, { text: string; color: string }> = {
                  pending: { text: '承認待ち', color: '#fbbf24' },
                  approved: { text: '承認済み', color: '#34d399' },
                  rejected: { text: '却下', color: '#f87171' },
                }
                const st = statusLabel[h.status] || { text: h.status, color: 'var(--t2)' }
                return (
                  <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--b)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{typeLabel[h.type] || h.type}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{h.startDate} ～ {h.endDate}</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: st.color, padding: '4px 10px', background: `${st.color}15`, borderRadius: 6 }}>
                      {st.text}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {toast && <div style={{ ...S.toast, borderColor: toastType === 'error' ? '#f87171' : 'var(--b2)' }}>{toastType === 'error' ? '❌' : '✅'} {toast}</div>}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  app:             { display: 'flex', height: '100vh', overflow: 'hidden' },
  main:            { flex: 1, overflowY: 'auto', background: 'var(--bg)', paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' },
  page:            { padding: '20px 16px' },
  pageTitle:       { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  pageSub:         { fontSize: 13, color: 'var(--t2)', marginBottom: 20 },
  card:            { background: 'var(--s1)', border: '1px solid var(--b)', borderRadius: 14, padding: '20px 16px', maxWidth: 560 },
  typeGrid:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 },
  typeCard:        { padding: 12, borderRadius: 10, border: '2px solid transparent', cursor: 'pointer', background: 'var(--s2)', position: 'relative', transition: 'all .15s', minHeight: 44 },
  typeCardSelected:{ background: 'rgba(56,189,248,.15)', border: '2px solid #38bdf8', boxShadow: '0 0 12px rgba(56,189,248,.2)' },
  formRow:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 },
  label:           { fontSize: 11, color: 'var(--t2)', marginBottom: 6, display: 'block' },
  input:           { width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 16, outline: 'none', marginBottom: 14, minHeight: 44 },
  summary:         { padding: '10px 14px', background: 'rgba(56,189,248,.07)', border: '1px solid rgba(56,189,248,.15)', borderRadius: 8, fontSize: 12, color: 'var(--t2)', marginBottom: 14 },
  submitBtn:       { width: '100%', padding: 15, borderRadius: 12, border: 0, background: 'var(--acc)', color: '#0a0f1e', fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 44 },
  toast:           { position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 12, padding: '12px 20px', fontSize: 13, whiteSpace: 'nowrap', boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 999, maxWidth: 'calc(100vw - 32px)' },
}