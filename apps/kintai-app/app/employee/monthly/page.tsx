'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { apiGet } from '@/lib/api'

interface MonthlySummary {
  workDays: number
  totalWorkHours: number
  totalOvertimeHours: number
  paidLeaveBalance: number
  paidLeaveTaken: number
}

interface AttendanceRecord {
  date: string
  workMin: number
  overtimeMin: number
  status: string
  workPlace: string
  checkInTime: string | null
  checkOutTime: string | null
}

export default function MonthlyPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)
  const [summary, setSummary] = useState<MonthlySummary>({
    workDays: 0,
    totalWorkHours: 0,
    totalOvertimeHours: 0,
    paidLeaveBalance: 0,
    paidLeaveTaken: 0,
  })
  const [records, setRecords] = useState<AttendanceRecord[]>([])

  useEffect(() => {
    const u = sessionStorage.getItem('user')
    if (!u) { router.push('/login'); return }
    setUser(JSON.parse(u))
  }, [router])

  useEffect(() => {
    apiGet('/api/attendance?range=monthly')
      .then(data => {
        if (data.summary) {
          setSummary(data.summary)
        }
        if (data.records) {
          setRecords(data.records)
        }
      })
      .catch(() => {})
  }, [])

  if (!user) return null

  const ot = summary.totalOvertimeHours || 0
  const pct = Math.min(100, ot / 60 * 100)
  const gaugeColor = ot >= 60 ? 'var(--red)' : ot >= 45 ? 'var(--orange)' : ot >= 36 ? 'var(--amber)' : 'var(--green)'
  const days = (records || []).map(r => r.workMin ? r.workMin / 60 : 0)

  return (
    <div style={S.app}>
      <Sidebar active="monthly" />
      <main style={S.main}>
        <div style={S.page}>
          <div style={S.pageTitle}>月次サマリ</div>
          <div style={S.pageSub}>{new Date().getFullYear()}年{new Date().getMonth() + 1}月 / {user.name}</div>

          {/* KPI */}
          <div style={S.kpiGrid}>
            {[
              { label: '出勤日数',   value: String(summary.workDays || 0), unit: '日', color: 'var(--acc)',    sub: '前月比 +1日' },
              { label: '総実働時間', value: String(summary.totalWorkHours || 0), unit: 'h', color: 'var(--green)', sub: '所定 128h' },
              { label: '残業時間',   value: String(ot), unit: 'h', color: gaugeColor,  sub: ot >= 45 ? '⚠ 警告' : ot >= 36 ? '⚠ 注意' : '正常' },
              { label: '有給残日数', value: String(summary.paidLeaveBalance || 0), unit: '日', color: 'var(--purple)', sub: '付与 20日' },
            ].map(k => (
              <div key={k.label} style={S.kpi}>
                <div style={S.kpiLabel}>{k.label}</div>
                <div style={{ ...S.kpiVal, color: k.color }}>
                  {k.value}<span style={{ fontSize: 14, color: 'var(--t2)' }}> {k.unit}</span>
                </div>
                <div style={S.kpiSub}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* 有給取得進捗バー（ナッジ） */}
          {(() => {
            const balance = summary.paidLeaveBalance || 0
            const taken = summary.paidLeaveTaken || 0
            const total = taken + balance
            const takenPct = total > 0 ? Math.round(taken / total * 100) : 0
            const targetPct = 70
            const barColor = takenPct >= 60 ? 'var(--green)' : takenPct >= 30 ? 'var(--amber)' : 'var(--red)'
            const expiringDays = balance // 簡易計算
            return (
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <span style={S.cardTitle}>有給取得状況</span>
                  {takenPct < 30 && <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>⚠ 取得率が低いです</span>}
                </div>
                <div style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--t2)', marginBottom: 6 }}>
                    <span>取得率</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, color: barColor }}>{takenPct}% / 目標{targetPct}%</span>
                  </div>
                  <div style={{ height: 10, background: 'var(--s3)', borderRadius: 5, overflow: 'hidden', marginBottom: 6, position: 'relative' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, takenPct)}%`, background: barColor, borderRadius: 5, transition: 'width .8s ease' }} />
                    <div style={{ position: 'absolute', left: `${targetPct}%`, top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,.4)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--t3)' }}>取得 {taken}日 / 残 {balance}日</span>
                    {expiringDays > 0 && (
                      <span style={{ color: 'var(--amber)', fontWeight: 600 }}>
                        あと{expiringDays}日分の有給が消滅します
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* 残業ゲージ */}
          <div style={S.card}>
            <div style={S.cardHeader}><span style={S.cardTitle}>残業ゲージ</span></div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t2)', marginBottom: 8 }}>
                <span>今月の残業時間</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, color: gaugeColor }}>{ot}h / 60h</span>
              </div>
              <div style={{ height: 10, background: 'var(--s3)', borderRadius: 5, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: gaugeColor, borderRadius: 5, transition: 'width .8s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--t3)' }}>
                <span>0h</span><span>36h</span><span>45h</span><span>60h</span>
              </div>
            </div>
          </div>

          {/* 日次バーチャート */}
          <div style={S.card}>
            <div style={S.cardHeader}><span style={S.cardTitle}>日次実働バーチャート</span></div>
            <div style={{ padding: 20, overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, minWidth: 400 }}>
                {days.map((h, i) => {
                  const barPct = h / 12 * 100
                  const color = h === 0 ? 'var(--s3)' : h > 8 ? 'var(--orange)' : 'var(--acc)'
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                      <div style={{ width: '100%', height: `${Math.max(2, barPct)}%`, background: color, borderRadius: '4px 4px 0 0' }} title={h ? `${h}h` : '-'} />
                      <div style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'DM Mono, monospace' }}>{i + 1}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  app:       { display: 'flex', height: '100vh', overflow: 'hidden' },
  main:      { flex: 1, overflowY: 'auto', background: 'var(--bg)', paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' },
  page:      { padding: '20px 16px' },
  pageTitle: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  pageSub:   { fontSize: 13, color: 'var(--t2)', marginBottom: 20 },
  kpiGrid:   { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 16 },
  kpi:       { background: 'var(--s1)', border: '1px solid var(--b)', borderRadius: 12, padding: '18px 20px' },
  kpiLabel:  { fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 },
  kpiVal:    { fontSize: 28, fontWeight: 700, fontFamily: 'DM Mono, monospace' },
  kpiSub:    { fontSize: 11, color: 'var(--t3)', marginTop: 4 },
  card:      { background: 'var(--s1)', border: '1px solid var(--b)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  cardHeader:{ padding: '16px 20px', borderBottom: '1px solid var(--b)' },
  cardTitle: { fontSize: 13, fontWeight: 600 },
}