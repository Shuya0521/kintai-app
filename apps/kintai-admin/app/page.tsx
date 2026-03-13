'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import { formatMinToHHMM, formatDateFullJP, getTodayStr } from '@kintai/shared'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface DashboardData {
  today: {
    working: number
    breaking: number
    done: number
    office: number
    remote: number
    onLeave: number
  }
  pendingApprovals: number
  pendingUsers: number
  totalUsers: number
  overtimeWarnings: number
  members: Array<{
    id: string
    name: string
    dept: string
    status: string
    workPlace: string
    checkIn: string | null
    workMin: number
    overtimeMin: number
  }>
}


export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useCurrentUser()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin').then(r => r.json()).then(adminRes => {
      setData(adminRes)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  if (authLoading || loading || !data || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ color: 'var(--t2)' }}>読み込み中...</div>
      </div>
    )
  }

  const kpiCards = [
    { label: '本日出勤', value: `${data.today.working + data.today.done}名`, color: 'var(--green)' },
    { label: '在宅勤務', value: `${data.today.remote}名`, color: 'var(--purple)' },
    { label: '承認待ち', value: `${data.pendingApprovals}件`, color: 'var(--amber)' },
    { label: '残業警告', value: `${data.overtimeWarnings}名`, color: 'var(--red)' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar userName={user.name} userRole={user.role} />
      <main style={{ flex: 1, padding: 24 }} className="md:ml-[220px] ml-0 pb-24 md:pb-6">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>管理者ダッシュボード</h1>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 24 }}>
          {formatDateFullJP(getTodayStr())}
        </p>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {kpiCards.map((card) => (
            <div key={card.label} style={{
              background: 'var(--s1)',
              borderRadius: 12,
              padding: '16px 20px',
              border: '1px solid var(--b)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Real-time Status */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <div style={{
            background: 'var(--s1)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid var(--b)',
          }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>リアルタイムステータス</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.members.slice(0, 10).map((m) => (
                <div key={m.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: m.status === 'done' ? 'var(--t3)' :
                        m.workPlace === 'remote' ? 'var(--purple)' : 'var(--green)',
                    }} />
                    <span style={{ fontSize: 13 }}>{m.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: m.status === 'working' ? 'rgba(52,211,153,0.15)' :
                        m.status === 'breaking' ? 'rgba(251,191,36,0.15)' : 'rgba(63,84,104,0.15)',
                      color: m.status === 'working' ? 'var(--green)' :
                        m.status === 'breaking' ? 'var(--amber)' : 'var(--t2)',
                    }}>
                      {m.status === 'working' ? (m.workPlace === 'remote' ? '在宅中' : '勤務中') :
                        m.status === 'breaking' ? '休憩中' : '退勤済'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'monospace' }}>
                      {formatMinToHHMM(m.workMin)}
                    </span>
                  </div>
                </div>
              ))}
              {data.members.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--t3)', textAlign: 'center', padding: 20 }}>
                  本日の出勤記録はありません
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            background: 'var(--s1)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid var(--b)',
          }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>クイックアクション</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.pendingApprovals > 0 && (
                <button
                  onClick={() => router.push('/approvals')}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: 8,
                    background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
                    color: 'var(--amber)', cursor: 'pointer', fontSize: 13,
                  }}
                >
                  <span>承認待ち {data.pendingApprovals}件</span>
                  <span>→</span>
                </button>
              )}
              {data.pendingUsers > 0 && (
                <button
                  onClick={() => router.push('/members')}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: 8,
                    background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)',
                    color: 'var(--acc)', cursor: 'pointer', fontSize: 13,
                  }}
                >
                  <span>新規登録申請 {data.pendingUsers}名</span>
                  <span>→</span>
                </button>
              )}
              {data.overtimeWarnings > 0 && (
                <button
                  onClick={() => router.push('/overtime')}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: 8,
                    background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                    color: 'var(--red)', cursor: 'pointer', fontSize: 13,
                  }}
                >
                  <span>残業警告 {data.overtimeWarnings}名</span>
                  <span>→</span>
                </button>
              )}
              <button
                onClick={() => router.push('/attendance')}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderRadius: 8,
                  background: 'var(--s2)', border: '1px solid var(--b)',
                  color: 'var(--text)', cursor: 'pointer', fontSize: 13,
                }}
              >
                <span>全社員 勤怠一覧</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
