'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { apiGet, apiPost } from '@/lib/api'

interface AttendanceRecord {
  id: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  breakTotalMin: number
  workPlace: string
  note: string
  status: string
}

interface CorrectionHistory {
  id: string
  checkInTime: string | null
  checkOutTime: string | null
  breakTotalMin: number | null
  workPlace: string | null
  note: string | null
  reason: string
  status: string
  createdAt: string
  attendance: { date: string; checkInTime: string | null; checkOutTime: string | null; breakTotalMin: number; workPlace: string }
  approval: { id: string; status: string; comment: string; processedAt: string | null } | null
}

export default function StampCorrectionPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)
  const [date, setDate] = useState('')
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null)
  const [lookupDone, setLookupDone] = useState(false)
  const [lookupErr, setLookupErr] = useState('')

  // 修正フォーム
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [breakMin, setBreakMin] = useState('')
  const [workPlace, setWorkPlace] = useState('')
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')
  const [history, setHistory] = useState<CorrectionHistory[]>([])

  useEffect(() => {
    apiGet('/api/auth/me').then(d => {
      setUser(d.user)
      try { sessionStorage.setItem('user', JSON.stringify(d.user)) } catch { /* private browsing */ }
    }).catch(() => router.push('/login'))
  }, [router])

  const loadHistory = () => {
    apiGet('/api/requests/stamp-correction').then(d => setHistory(d.corrections || [])).catch(() => {})
  }
  useEffect(() => { loadHistory() }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // 日付指定して勤怠データを取得
  const lookupAttendance = async () => {
    if (!date) return
    setLookupDone(false)
    setLookupErr('')
    setAttendance(null)
    try {
      const data = await apiGet(`/api/attendance/lookup?date=${date}`)
      setAttendance(data.attendance)
      setLookupDone(true)
      // 現在値をフォームにセット
      const a = data.attendance
      if (a) {
        setCheckIn(a.checkInTime ? toTimeStr(a.checkInTime) : '')
        setCheckOut(a.checkOutTime ? toTimeStr(a.checkOutTime) : '')
        setBreakMin(String(a.breakTotalMin || 0))
        setWorkPlace(a.workPlace || 'office')
        setNote(a.note || '')
      }
    } catch (e: unknown) {
      setLookupErr(e instanceof Error ? e.message : '勤怠データの取得に失敗しました')
      setLookupDone(true)
    }
  }

  const handleSubmit = async () => {
    if (!reason.trim()) { showToast('修正理由を入力してください'); return }
    setSubmitting(true)
    try {
      await apiPost('/api/requests/stamp-correction', {
        date,
        checkInTime: checkIn ? toISOFromTime(date, checkIn) : null,
        checkOutTime: checkOut ? toISOFromTime(date, checkOut) : null,
        breakTotalMin: breakMin !== '' ? Number(breakMin) : undefined,
        workPlace: workPlace || undefined,
        note,
        reason,
      })
      showToast('打刻修正申請を送信しました')
      setDate('')
      setAttendance(null)
      setLookupDone(false)
      setReason('')
      loadHistory()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '申請に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div style={S.app}>
      <Sidebar active="requests" />
      <main style={S.main}>
        <div style={S.page}>
          <div style={S.pageTitle}>打刻修正申請</div>
          <div style={S.pageSub}>出退勤時刻・休憩時間・勤務場所の修正を申請できます</div>

          {/* 日付選択 */}
          <div style={S.card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>① 修正する日付を選択</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>対象日付 *</label>
                <input style={S.input} type="date" value={date} onChange={e => { setDate(e.target.value); setLookupDone(false); setAttendance(null) }} />
              </div>
              <button
                style={{ ...S.lookupBtn, opacity: !date ? 0.5 : 1 }}
                disabled={!date}
                onClick={lookupAttendance}
              >
                🔍 検索
              </button>
            </div>

            {lookupErr && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{lookupErr}</div>}

            {lookupDone && attendance && (
              <>
                {/* 現在の勤怠情報 */}
                <div style={S.currentInfo}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--t2)' }}>📋 現在の勤怠データ</div>
                  <div style={S.infoGrid}>
                    <div style={S.infoItem}><span style={S.infoLabel}>出勤</span><span>{attendance.checkInTime ? toTimeStr(attendance.checkInTime) : '未打刻'}</span></div>
                    <div style={S.infoItem}><span style={S.infoLabel}>退勤</span><span>{attendance.checkOutTime ? toTimeStr(attendance.checkOutTime) : '未打刻'}</span></div>
                    <div style={S.infoItem}><span style={S.infoLabel}>休憩</span><span>{attendance.breakTotalMin}分</span></div>
                    <div style={S.infoItem}><span style={S.infoLabel}>場所</span><span>{attendance.workPlace === 'remote' ? '在宅' : '出社'}</span></div>
                  </div>
                </div>

                {/* 修正入力 */}
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, marginTop: 20 }}>② 修正内容を入力</div>

                <div style={S.formRow}>
                  <div>
                    <label style={S.label}>出勤時刻</label>
                    <input style={S.input} type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
                  </div>
                  <div>
                    <label style={S.label}>退勤時刻</label>
                    <input style={S.input} type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
                  </div>
                </div>

                <div style={S.formRow}>
                  <div>
                    <label style={S.label}>休憩時間（分）</label>
                    <input style={S.input} type="number" min={0} value={breakMin} onChange={e => setBreakMin(e.target.value)} />
                  </div>
                  <div>
                    <label style={S.label}>勤務場所</label>
                    <select style={S.input} value={workPlace} onChange={e => setWorkPlace(e.target.value)}>
                      <option value="office">出社</option>
                      <option value="remote">在宅</option>
                    </select>
                  </div>
                </div>

                <label style={S.label}>備考</label>
                <input style={S.input} type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="任意" />

                <label style={S.label}>修正理由 *</label>
                <textarea
                  style={{ ...S.input, resize: 'vertical' }}
                  rows={3}
                  placeholder="例: 打刻忘れのため / 出勤時間の入力間違い"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />

                <button
                  style={{ ...S.submitBtn, opacity: submitting ? 0.7 : 1 }}
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? '送信中...' : '修正を申請する →'}
                </button>
              </>
            )}

            {lookupDone && !attendance && !lookupErr && (
              <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 12, textAlign: 'center', padding: 20 }}>
                この日付の勤怠レコードが見つかりません
              </div>
            )}
          </div>

          {/* 申請履歴 */}
          {history.length > 0 && (
            <div style={{ ...S.card, marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>申請履歴</div>
              {history.map(h => {
                const statusMap: Record<string, { text: string; color: string }> = {
                  pending: { text: '承認待ち', color: '#fbbf24' },
                  applied: { text: '承認済み', color: '#34d399' },
                  approved: { text: '承認済み', color: '#34d399' }, // #13: approved も対応
                  rejected: { text: '却下', color: '#f87171' },
                }
                const st = statusMap[h.status] || { text: h.status, color: 'var(--t2)' }
                return (
                  <div key={h.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--b)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{h.attendance.date}</div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: st.color, padding: '3px 8px', background: `${st.color}15`, borderRadius: 6 }}>
                        {st.text}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t2)' }}>
                      理由: {h.reason}
                    </div>
                    {h.checkInTime && <div style={{ fontSize: 11, color: 'var(--t3)' }}>出勤 → {toTimeStr(h.checkInTime)}</div>}
                    {h.checkOutTime && <div style={{ fontSize: 11, color: 'var(--t3)' }}>退勤 → {toTimeStr(h.checkOutTime)}</div>}
                    {h.approval?.comment && (
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>コメント: {h.approval.comment}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* 戻るリンク */}
          <div style={{ marginTop: 16 }}>
            <a href="/employee/requests" style={{ fontSize: 13, color: 'var(--acc)', textDecoration: 'none' }}>← 休暇申請に戻る</a>
          </div>
        </div>
      </main>

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  )
}

// ── ヘルパー ──
function toTimeStr(iso: string): string {
  try {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return iso }
}

function toISOFromTime(dateStr: string, time: string): string {
  return new Date(`${dateStr}T${time}:00`).toISOString()
}

const S: Record<string, React.CSSProperties> = {
  app:         { display: 'flex', height: '100vh', overflow: 'hidden' },
  main:        { flex: 1, overflowY: 'auto', background: 'var(--bg)', paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' },
  page:        { padding: '20px 16px', maxWidth: 600 },
  pageTitle:   { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  pageSub:     { fontSize: 13, color: 'var(--t2)', marginBottom: 20 },
  card:        { background: 'var(--s1)', border: '1px solid var(--b)', borderRadius: 14, padding: '20px 16px' },
  formRow:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 0 },
  label:       { fontSize: 11, color: 'var(--t2)', marginBottom: 6, display: 'block' },
  input:       { width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 16, outline: 'none', marginBottom: 14, minHeight: 44, boxSizing: 'border-box' as const },
  lookupBtn:   { padding: '12px 20px', borderRadius: 10, border: 'none', background: 'var(--acc)', color: '#0a0f1e', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44, marginBottom: 14 },
  submitBtn:   { width: '100%', padding: 15, borderRadius: 12, border: 0, background: 'var(--acc)', color: '#0a0f1e', fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 44 },
  currentInfo: { marginTop: 16, padding: 14, background: 'rgba(56,189,248,.07)', border: '1px solid rgba(56,189,248,.15)', borderRadius: 10 },
  infoGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  infoItem:    { display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' },
  infoLabel:   { color: 'var(--t3)', fontWeight: 500 },
  toast:       { position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 12, padding: '12px 20px', fontSize: 13, whiteSpace: 'nowrap', boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 999, maxWidth: 'calc(100vw - 32px)' },
}
