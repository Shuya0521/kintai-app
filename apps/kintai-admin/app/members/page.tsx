'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import { DEPARTMENTS } from '@kintai/shared'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface Member {
  id: string
  lastName: string
  firstName: string
  email: string
  department: string
  role: string
  status: 'active' | 'inactive' | 'pending'
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: '有効', color: 'var(--green)', bg: 'rgba(52,211,153,0.15)' },
  inactive: { label: '無効', color: 'var(--red)', bg: 'rgba(248,113,113,0.15)' },
  pending: { label: '承認待ち', color: 'var(--amber)', bg: 'rgba(251,191,36,0.15)' },
}

export default function MembersPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editing, setEditing] = useState<Member | null>(null)

  const loadMembers = useCallback(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (deptFilter) params.set('department', deptFilter)
    if (statusFilter) params.set('status', statusFilter)
    fetch(`/api/users?${params}`).then(r => r.json()).then(d => setMembers(d.users || []))
  }, [search, deptFilter, statusFilter])

  useEffect(() => { loadMembers() }, [loadMembers])

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || '承認に失敗しました'); return }
      loadMembers()
    } catch { alert('通信エラーが発生しました') }
  }

  const handleEditSave = async () => {
    if (!editing) return
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: editing.id, department: editing.department, role: editing.role }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || '更新に失敗しました'); return }
      setEditing(null)
      loadMembers()
    } catch { alert('通信エラーが発生しました') }
  }

  if (!user) return null

  const active = members.filter(m => m.status === 'active').length
  const pending = members.filter(m => m.status === 'pending').length
  const depts = new Set(members.map(m => m.department)).size
  const kpis = [
    { label: '全メンバー', value: members.length, color: 'var(--acc)' },
    { label: '有効', value: active, color: 'var(--green)' },
    { label: '承認待ち', value: pending, color: 'var(--amber)' },
    { label: '部署数', value: depts, color: 'var(--acc)' },
  ]

  const inputStyle = {
    padding: '7px 12px', borderRadius: 6, border: '1px solid var(--b)',
    background: 'var(--s2)', color: 'var(--text)', fontSize: 16, outline: 'none',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar userName={user.name} userRole={user.role} />
      <main style={{ flex: 1, padding: 24 }} className="pb-24 md:pb-6">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>メンバー管理</h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 20 }}>
          {kpis.map(k => (
            <div key={k.label} style={{ background: 'var(--s1)', borderRadius: 10, padding: 14, border: '1px solid var(--b)' }}>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input placeholder="名前・メールで検索" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={inputStyle}>
            <option value="">全部署</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">全ステータス</option>
            <option value="active">有効</option>
            <option value="inactive">無効</option>
            <option value="pending">承認待ち</option>
          </select>
        </div>

        <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--b)' }}>
                {['名前', 'メール', '部署', '役割', 'ステータス', '操作'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--t3)', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--t3)' }}>メンバーが見つかりません</td></tr>
              ) : members.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--b)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{m.lastName} {m.firstName}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--t2)' }}>{m.email}</td>
                  <td style={{ padding: '10px 12px' }}>{m.department}</td>
                  <td style={{ padding: '10px 12px' }}>{m.role}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: STATUS_LABELS[m.status]?.bg, color: STATUS_LABELS[m.status]?.color }}>
                      {STATUS_LABELS[m.status]?.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <button onClick={() => setEditing({ ...m })} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', marginRight: 6 }}>編集</button>
                    {m.status === 'pending' && (
                      <button onClick={() => handleApprove(m.id)} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: 'var(--green)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>承認</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editing && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setEditing(null)}>
            <div style={{ background: 'var(--s1)', borderRadius: 12, padding: 24, width: 'min(400px, 90vw)', border: '1px solid var(--b)' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>メンバー編集</h2>
              <div style={{ fontSize: 14, marginBottom: 12 }}>{editing.lastName} {editing.firstName} ({editing.email})</div>
              <label style={{ fontSize: 12, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>部署</label>
              <select value={editing.department} onChange={e => setEditing({ ...editing, department: e.target.value })} style={{ ...inputStyle, width: '100%', marginBottom: 12 }}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <label style={{ fontSize: 12, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>役割</label>
              <input value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value })} style={{ ...inputStyle, width: '100%', marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditing(null)} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--t2)', fontSize: 13, cursor: 'pointer' }}>キャンセル</button>
                <button onClick={handleEditSave} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', background: 'var(--acc)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>保存</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
