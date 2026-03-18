'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import { LEAVE_TYPE_LABELS, formatDateJP } from '@kintai/shared'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface ApprovalItem {
  id: string
  requestType: string
  status: string
  comment: string
  createdAt: string
  requester?: { lastName: string; firstName: string; department: string; role: string }
  leaveRequest?: { type: string; startDate: string; endDate: string; reason: string }
}

export default function ApprovalsPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [processing, setProcessing] = useState<string | null>(null)

  const loadApprovals = () => {
    fetch('/api/approvals').then(r => r.json()).then(d => {
      setApprovals(d.approvals || [])
    })
  }

  useEffect(() => { loadApprovals() }, [])

  const handleAction = async (approvalId: string, action: 'approve' | 'reject') => {
    setProcessing(approvalId)
    try {
      await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId, action }),
      })
      loadApprovals()
    } finally {
      setProcessing(null)
    }
  }

  if (!user) return null

  const filtered = filter === 'pending' ? approvals.filter(a => a.status === 'pending') : approvals

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar userName={user.name} userRole={user.role} />
      <main style={{ flex: 1, padding: 24 }} className="pb-24 md:pb-6">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>承認管理</h1>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['pending', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 16px', borderRadius: 6, border: '1px solid var(--b)',
              background: filter === f ? 'var(--acc)' : 'var(--s2)',
              color: filter === f ? '#fff' : 'var(--t2)', cursor: 'pointer', fontSize: 13,
            }}>
              {f === 'pending' ? '未処理' : 'すべて'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)', background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b)' }}>
              {filter === 'pending' ? '未処理の申請はありません' : '承認履歴がありません'}
            </div>
          ) : filtered.map(a => (
            <div key={a.id} style={{
              background: 'var(--s1)', borderRadius: 12, padding: 16, border: '1px solid var(--b)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {a.requester ? `${a.requester.lastName} ${a.requester.firstName}` : ''}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t2)' }}>
                    {a.requester?.department} / {a.requester?.role}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 4,
                  background: a.status === 'pending' ? 'rgba(251,191,36,0.15)' :
                    a.status === 'approved' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                  color: a.status === 'pending' ? 'var(--amber)' :
                    a.status === 'approved' ? 'var(--green)' : 'var(--red)',
                }}>
                  {a.status === 'pending' ? '承認待ち' : a.status === 'approved' ? '承認済み' : '却下'}
                </span>
              </div>

              {a.leaveRequest && (
                <div style={{ fontSize: 13, marginBottom: 8 }}>
                  {LEAVE_TYPE_LABELS[a.leaveRequest.type] || a.leaveRequest.type}: {formatDateJP(a.leaveRequest.startDate)}
                  {a.leaveRequest.startDate !== a.leaveRequest.endDate && ` 〜 ${formatDateJP(a.leaveRequest.endDate)}`}
                  {a.leaveRequest.reason && <span style={{ color: 'var(--t2)' }}> ({a.leaveRequest.reason})</span>}
                </div>
              )}

              {a.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => handleAction(a.id, 'approve')}
                    disabled={processing === a.id}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 6, border: 'none',
                      background: 'var(--green)', color: '#fff', fontWeight: 600,
                      fontSize: 13, cursor: 'pointer', opacity: processing === a.id ? 0.6 : 1,
                    }}
                  >
                    承認
                  </button>
                  <button
                    onClick={() => handleAction(a.id, 'reject')}
                    disabled={processing === a.id}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 6,
                      border: '1px solid var(--red)', background: 'transparent',
                      color: 'var(--red)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      opacity: processing === a.id ? 0.6 : 1,
                    }}
                  >
                    却下
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
