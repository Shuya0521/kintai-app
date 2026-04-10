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
  processedAt?: string
  requester?: { lastName: string; firstName: string; department: string; role: string }
  approver?: { lastName: string; firstName: string }
  leaveRequest?: { type: string; startDate: string; endDate: string; reason: string }
}

export default function ApprovalsPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
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
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId, action }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || '処理に失敗しました')
        return
      }
      loadApprovals()
    } catch {
      alert('通信エラーが発生しました')
    } finally {
      setProcessing(null)
    }
  }

  if (!user) return null

  const filtered = approvals.filter(a => a.status === filter)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar userName={user.name} userRole={user.role} />
      <main style={{ flex: 1, padding: 24 }} className="pb-24 md:pb-6">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>承認管理</h1>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {([
            { key: 'pending', label: '未処理', count: approvals.filter(a => a.status === 'pending').length },
            { key: 'approved', label: '承認済み', count: approvals.filter(a => a.status === 'approved').length },
            { key: 'rejected', label: '却下', count: approvals.filter(a => a.status === 'rejected').length },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '6px 16px', borderRadius: 6, border: '1px solid var(--b)',
              background: filter === f.key ? 'var(--acc)' : 'var(--s2)',
              color: filter === f.key ? '#fff' : 'var(--t2)', cursor: 'pointer', fontSize: 13,
            }}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)', background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b)' }}>
              {filter === 'pending' ? '未処理の申請はありません' : filter === 'approved' ? '承認済みの履歴はありません' : '却下の履歴はありません'}
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

              {a.status !== 'pending' && (
                <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 4 }}>
                  {a.approver && <span>処理者: {a.approver.lastName} {a.approver.firstName}</span>}
                  {a.processedAt && <span style={{ marginLeft: 12 }}>{formatDateJP(a.processedAt.slice(0, 10))}</span>}
                  {a.comment && <div style={{ marginTop: 4, color: 'var(--t2)', fontStyle: 'italic' }}>「{a.comment}」</div>}
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
