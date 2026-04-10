'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { apiGet } from '@/lib/api'

interface AttendanceRecord {
  date: string
  workMin: number
  overtimeMin: number
  status: string
  workPlace: string
  checkInTime: string | null
  checkOutTime: string | null
}

export default function DailyPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [logs, setLogs] = useState<{ date: string; in: string; out: string; work: string; ot: string; st: string; place: string }[]>([])
  const [toast, setToast] = useState('')

  useEffect(() => {
    apiGet('/api/auth/me').then(data => {
      setUser(data.user)
      try { sessionStorage.setItem('user', JSON.stringify(data.user)) } catch { /* private browsing */ }
    }).catch(() => router.push('/login'))
  }, [router])

  useEffect(() => {
    apiGet('/api/attendance?range=daily')
      .then(data => {
        const formatted = (data.records || []).map((r: AttendanceRecord) => {
          const d = new Date(r.date + 'T00:00:00')
          const days = ['日','月','火','水','木','金','土']
          const dateStr = `${d.getMonth()+1}/${d.getDate()}（${days[d.getDay()]}）`
          const inTime = r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('ja-JP', {hour:'2-digit',minute:'2-digit'}) : '—'
          const outTime = r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('ja-JP', {hour:'2-digit',minute:'2-digit'}) : '—'
          const workH = Math.floor(r.workMin / 60)
          const workM = r.workMin % 60
          const otH = Math.floor(r.overtimeMin / 60)
          const otM = r.overtimeMin % 60
          return {
            date: dateStr,
            in: inTime,
            out: outTime,
            work: r.workMin > 0 ? `${workH}h${workM}m` : '—',
            ot: r.overtimeMin > 0 ? `${otH}h${otM}m` : '0h',
            st: r.status === 'done' ? '確定' : r.status === 'holiday' ? '有給' : '未打刻',
            place: r.workPlace || '',
          }
        })
        setLogs(formatted)
      })
      .catch(() => {})
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  if (!user) return null

  return (
    <div style={S.app}>
      <Sidebar active="daily" />
      <main style={S.main}>
        <div style={S.page}>
          <div style={S.pageTitle}>日次一覧</div>
          <div style={S.pageSub}>{new Date().getFullYear()}年{new Date().getMonth() + 1}月 / {user.name}</div>
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>📅 打刻履歴</span>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['日付','場所','出勤','退勤','実働','残業','状態',''].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, i) => (
                    <tr key={i}>
                      <td style={{ ...S.td, color: 'var(--text)', fontWeight: 500 }}>{l.date}</td>
                      <td style={S.td}>
                        {l.place === 'remote' && <PlaceBadge type="remote" />}
                        {l.place === 'office' && <PlaceBadge type="office" />}
                      </td>
                      <td style={{ ...S.td, color: 'var(--green)', fontFamily: 'DM Mono, monospace' }}>{l.in}</td>
                      <td style={{ ...S.td, color: 'var(--red)', fontFamily: 'DM Mono, monospace' }}>{l.out}</td>
                      <td style={{ ...S.td, fontFamily: 'DM Mono, monospace' }}>{l.work}</td>
                      <td style={{ ...S.td, fontFamily: 'DM Mono, monospace', color: l.ot === '—' || l.ot === '0h00m' ? 'var(--t3)' : 'var(--amber)' }}>{l.ot}</td>
                      <td style={S.td}><StatusBadge st={l.st} /></td>
                      <td style={S.td}>
                        <span style={S.amendLink} onClick={() => router.push(`/employee/requests/stamp-correction?date=${l.date}`)}>修正申請</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      {toast && <div style={S.toast}>📝 {toast}</div>}
    </div>
  )
}

function PlaceBadge({ type }: { type: 'remote' | 'office' }) {
  return (
    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, fontWeight: 600, fontFamily: 'DM Mono, monospace', border: '1px solid', color: type === 'remote' ? 'var(--purple)' : 'var(--green)', background: type === 'remote' ? 'rgba(167,139,250,.1)' : 'rgba(52,211,153,.1)', borderColor: type === 'remote' ? 'rgba(167,139,250,.2)' : 'rgba(52,211,153,.2)' }}>
      {type === 'remote' ? '🏠在宅' : '🏢出社'}
    </span>
  )
}

function StatusBadge({ st }: { st: string }) {
  const conf: Record<string, { color: string; bg: string; border: string }> = {
    '確定':  { color: 'var(--t2)',  bg: 'rgba(148,163,184,.07)', border: 'rgba(148,163,184,.1)' },
    '有給':  { color: 'var(--acc)', bg: 'rgba(56,189,248,.1)',   border: 'rgba(56,189,248,.2)'  },
    '未打刻':{ color: 'var(--red)', bg: 'rgba(248,113,113,.1)',  border: 'rgba(248,113,113,.2)' },
  }
  const c = conf[st] ?? conf['確定']
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 500, fontFamily: 'DM Mono, monospace', border: `1px solid ${c.border}`, color: c.color, background: c.bg }}>
      {st}
    </span>
  )
}

const S: Record<string, React.CSSProperties> = {
  app:       { display: 'flex', height: '100vh', overflow: 'hidden' },
  main:      { flex: 1, overflowY: 'auto', background: 'var(--bg)', paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' },
  page:      { padding: '20px 16px' },
  pageTitle: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  pageSub:   { fontSize: 13, color: 'var(--t2)', marginBottom: 24 },
  card:      { background: 'var(--s1)', border: '1px solid var(--b)', borderRadius: 12, overflow: 'hidden' },
  cardHeader:{ padding: '16px 20px', borderBottom: '1px solid var(--b)' },
  cardTitle: { fontSize: 13, fontWeight: 600 },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th:        { padding: '10px 12px', textAlign: 'left', color: 'var(--t3)', fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 500, borderBottom: '1px solid var(--b)', background: 'rgba(0,0,0,.2)', whiteSpace: 'nowrap' },
  td:        { padding: '11px 12px', borderBottom: '1px solid rgba(30,45,69,.5)', color: 'var(--t2)', whiteSpace: 'nowrap' },
  amendLink: { fontSize: 11, color: 'var(--t3)', cursor: 'pointer' },
  toast:     { position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 12, padding: '12px 20px', fontSize: 13, whiteSpace: 'nowrap', boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 999 },
}