'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import { formatMinToHHMM } from '@kintai/shared'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface OvertimeRecord {
  id: string
  name: string
  dept: string
  overtimeMin: number
}

const LIMIT_45H = 45 * 60
const LIMIT_80H = 80 * 60
const LIMIT_100H = 100 * 60

function getOvertimeColor(min: number): string {
  if (min > 60 * 60) return 'var(--red)'
  if (min > LIMIT_45H) return 'var(--orange)'
  if (min > 36 * 60) return 'var(--amber)'
  return 'var(--green)'
}

function getOvertimeLabel(min: number): string | null {
  if (min >= LIMIT_100H) return '上限超過'
  if (min >= LIMIT_80H) return '面接指導対象'
  if (min >= LIMIT_45H) return '36協定警告'
  return null
}

export default function OvertimePage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [records, setRecords] = useState<OvertimeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin?month=${month}`).then(r => r.json()).then(d => {
      const members: OvertimeRecord[] = (d.members || [])
        .map((m: OvertimeRecord) => ({ id: m.id, name: m.name, dept: m.dept, overtimeMin: m.overtimeMin }))
        .sort((a: OvertimeRecord, b: OvertimeRecord) => b.overtimeMin - a.overtimeMin)
      setRecords(members)
    }).catch(() => {
      // #12: fetchエラー時もローディング解除
    }).finally(() => {
      setLoading(false)
    })
  }, [month])

  const changeMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  if (!user) return null

  const [year, mon] = month.split('-').map(Number)
  const warn45 = records.filter(r => r.overtimeMin >= LIMIT_45H).length
  const warn80 = records.filter(r => r.overtimeMin >= LIMIT_80H).length
  const warn100 = records.filter(r => r.overtimeMin >= LIMIT_100H).length
  const maxMin = Math.max(...records.map(r => r.overtimeMin), LIMIT_45H)

  const summaryCards = [
    { label: '45h超過（36協定）', value: `${warn45}名`, color: 'var(--orange)' },
    { label: '80h超過（面接指導）', value: `${warn80}名`, color: 'var(--red)' },
    { label: '100h超過（上限）', value: `${warn100}名`, color: 'var(--red)' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar userName={user.name} userRole={user.role} />
      <main style={{ flex: 1, padding: 24 }} className="pb-24 md:pb-6">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>残業レポート</h1>

        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <button onClick={() => changeMonth(-1)} style={{
            padding: '6px 12px', background: 'var(--s2)', border: '1px solid var(--b)',
            borderRadius: 6, color: 'var(--text)', cursor: 'pointer',
          }}>{'<'}</button>
          <span style={{ fontSize: 16, fontWeight: 600, minWidth: 120, textAlign: 'center' }}>
            {year}年{mon}月
          </span>
          <button onClick={() => changeMonth(1)} style={{
            padding: '6px 12px', background: 'var(--s2)', border: '1px solid var(--b)',
            borderRadius: 6, color: 'var(--text)', cursor: 'pointer',
          }}>{'>'}</button>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {summaryCards.map(c => (
            <div key={c.label} style={{
              background: 'var(--s1)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--b)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Overtime ranking */}
        <div style={{ background: 'var(--s1)', borderRadius: 12, padding: 20, border: '1px solid var(--b)', overflowX: 'auto' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>社員別 残業ランキング</h2>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)' }}>読み込み中...</div>
          ) : records.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)' }}>データがありません</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {records.map((r) => {
                const pct = Math.min((r.overtimeMin / maxMin) * 100, 100)
                const color = getOvertimeColor(r.overtimeMin)
                const label = getOvertimeLabel(r.overtimeMin)
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 80, fontSize: 13, whiteSpace: 'nowrap' }}>{r.name}</div>
                    <div style={{ minWidth: 50, fontSize: 11, color: 'var(--t2)' }}>{r.dept}</div>
                    <div style={{ flex: 1, background: 'var(--s2)', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ minWidth: 55, fontSize: 13, fontFamily: 'monospace', textAlign: 'right', color }}>
                      {formatMinToHHMM(r.overtimeMin)}
                    </div>
                    {label && (
                      <span style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                        background: r.overtimeMin >= LIMIT_80H ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)',
                        color,
                      }}>{label}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 36 Agreement reference */}
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--t2)', lineHeight: 1.8 }}>
          36協定基準: 月45h（警告） / 月80h（医師面接指導） / 月100h（絶対上限）
        </div>
      </main>
    </div>
  )
}
