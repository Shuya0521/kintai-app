'use client'

import { useState, useEffect } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { formatMinToHHMM } from '@kintai/shared'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface AttendanceRecord {
  id: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  breakTotalMin: number
  workMin: number
  overtimeMin: number
  lateMin: number
  earlyLeaveMin: number
  workPlace: string
  status: string
  note: string
}

interface UserWithAttendances {
  id: string
  employeeNumber: string
  name: string
  department: string
  role: string
  attendances: AttendanceRecord[]
}

interface EditForm {
  checkInTime: string
  checkOutTime: string
  breakTotalMin: string
  workPlace: string
  note: string
  reason: string
}

export default function AttendanceEditPage() {
  const { user } = useCurrentUser()
  const [data, setData] = useState<UserWithAttendances[]>([])
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ checkInTime: '', checkOutTime: '', breakTotalMin: '', workPlace: '', note: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ month })
    if (department) params.set('department', department)
    fetch(`/api/attendance/daily?${params}`)
      .then(r => r.json())
      .then(d => setData(d.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [month, department])

  const changeMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const startEdit = (record: AttendanceRecord) => {
    setEditingRecord(record)
    setEditForm({
      checkInTime: record.checkInTime ? new Date(record.checkInTime).toTimeString().slice(0, 5) : '',
      checkOutTime: record.checkOutTime ? new Date(record.checkOutTime).toTimeString().slice(0, 5) : '',
      breakTotalMin: String(record.breakTotalMin),
      workPlace: record.workPlace,
      note: record.note,
      reason: '',
    })
    setMessage('')
  }

  const handleSave = async () => {
    if (!editingRecord || !editForm.reason.trim()) {
      setMessage('修正理由を入力してください')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      // 日付部分を元レコードから取得してDateTime文字列を構築
      const dateStr = editingRecord.date
      const body: Record<string, unknown> = { reason: editForm.reason }

      if (editForm.checkInTime) {
        body.checkInTime = `${dateStr}T${editForm.checkInTime}:00`
      } else {
        body.checkInTime = null
      }
      if (editForm.checkOutTime) {
        body.checkOutTime = `${dateStr}T${editForm.checkOutTime}:00`
      } else {
        body.checkOutTime = null
      }
      body.breakTotalMin = parseInt(editForm.breakTotalMin) || 0
      body.workPlace = editForm.workPlace
      body.note = editForm.note

      const res = await fetch(`/api/attendance/${editingRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await res.json()
      if (!res.ok) {
        setMessage(result.error || '修正に失敗しました')
        return
      }

      setMessage('修正しました')
      setEditingRecord(null)

      // データ再読み込み
      const params = new URLSearchParams({ month })
      if (department) params.set('department', department)
      const reloadRes = await fetch(`/api/attendance/daily?${params}`)
      const reloadData = await reloadRes.json()
      setData(reloadData.data || [])
    } catch {
      setMessage('修正に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null
  const [year, mon] = month.split('-').map(Number)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar userName={user.name} userRole={user.role} />
      <main style={{ flex: 1, padding: 24 }} className="md:ml-[220px] ml-0 pb-24 md:pb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>勤怠修正</h1>
          <a href="/attendance" style={{ fontSize: 13, color: 'var(--acc)', textDecoration: 'none' }}>← 勤怠一覧に戻る</a>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => changeMonth(-1)} style={{ padding: '6px 12px', background: 'var(--s2)', border: '1px solid var(--b)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer' }}>{'<'}</button>
            <span style={{ fontSize: 16, fontWeight: 600, minWidth: 120, textAlign: 'center' }}>{year}年{mon}月</span>
            <button onClick={() => changeMonth(1)} style={{ padding: '6px 12px', background: 'var(--s2)', border: '1px solid var(--b)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer' }}>{'>'}</button>
          </div>
          <select value={department} onChange={e => setDepartment(e.target.value)} style={{ padding: '6px 12px', background: 'var(--s2)', border: '1px solid var(--b)', borderRadius: 6, color: 'var(--text)', fontSize: 16 }}>
            <option value="">全部署</option>
            <option value="営業部">営業部</option>
            <option value="工事部">工事部</option>
            <option value="リフォーム推進部">リフォーム推進部</option>
            <option value="管理部">管理部</option>
          </select>
        </div>

        {/* User list with expandable daily records */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>読み込み中...</div>
        ) : data.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)', background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b)' }}>データがありません</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.map(u => (
              <div key={u.id} style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b)', overflow: 'hidden' }}>
                {/* User header */}
                <button
                  onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                  style={{
                    width: '100%', padding: '12px 16px', background: 'transparent', border: 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', color: 'var(--text)', fontSize: 14,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', color: 'var(--t2)', fontSize: 12 }}>{u.employeeNumber}</span>
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--t2)' }}>{u.department} / {u.role}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--t3)' }}>{u.attendances.length}件</span>
                    <span style={{ fontSize: 16, color: 'var(--t3)' }}>{expandedUser === u.id ? '▼' : '▶'}</span>
                  </div>
                </button>

                {/* Expanded daily records */}
                {expandedUser === u.id && (
                  <div style={{ borderTop: '1px solid var(--b)' }}>
                    {u.attendances.length === 0 ? (
                      <div style={{ padding: 16, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>勤怠データなし</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--b)' }}>
                            {['日付', '出勤', '退勤', '休憩', '勤務', '残業', '場所', '操作'].map(h => (
                              <th key={h} style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--t2)', fontWeight: 500, fontSize: 11 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {u.attendances.map(a => {
                            const day = a.date.split('-')[2]
                            const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][new Date(a.date).getDay()]
                            const isWeekend = [0, 6].includes(new Date(a.date).getDay())
                            return (
                              <tr key={a.id} style={{ borderBottom: '1px solid var(--b)', background: isWeekend ? 'rgba(248,113,113,0.05)' : undefined }}>
                                <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                  {day}({dayOfWeek})
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'center', fontFamily: 'monospace' }}>
                                  {a.checkInTime ? new Date(a.checkInTime).toTimeString().slice(0, 5) : '-'}
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'center', fontFamily: 'monospace' }}>
                                  {a.checkOutTime ? new Date(a.checkOutTime).toTimeString().slice(0, 5) : '-'}
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'center', fontFamily: 'monospace' }}>{a.breakTotalMin}分</td>
                                <td style={{ padding: '6px 4px', textAlign: 'center', fontFamily: 'monospace' }}>{formatMinToHHMM(a.workMin)}</td>
                                <td style={{ padding: '6px 4px', textAlign: 'center', fontFamily: 'monospace', color: a.overtimeMin > 0 ? 'var(--amber)' : undefined }}>
                                  {a.overtimeMin > 0 ? formatMinToHHMM(a.overtimeMin) : '-'}
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'center', fontSize: 11 }}>
                                  {a.workPlace === 'remote' ? '🏠' : '🏢'}
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                                  <button
                                    onClick={() => startEdit(a)}
                                    style={{
                                      padding: '3px 10px', fontSize: 11, borderRadius: 4,
                                      border: '1px solid var(--acc)', background: 'transparent',
                                      color: 'var(--acc)', cursor: 'pointer',
                                    }}
                                  >
                                    修正
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editingRecord && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          }} onClick={() => setEditingRecord(null)}>
            <div style={{
              background: 'var(--s1)', borderRadius: 16, padding: 24, width: '90%', maxWidth: 440,
              border: '1px solid var(--b)', maxHeight: '90vh', overflowY: 'auto',
            }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>勤怠修正 — {editingRecord.date}</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ fontSize: 13 }}>
                  出勤時刻
                  <input type="time" value={editForm.checkInTime} onChange={e => setEditForm({ ...editForm, checkInTime: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--text)', marginTop: 4, fontSize: 16 }} />
                </label>
                <label style={{ fontSize: 13 }}>
                  退勤時刻
                  <input type="time" value={editForm.checkOutTime} onChange={e => setEditForm({ ...editForm, checkOutTime: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--text)', marginTop: 4, fontSize: 16 }} />
                </label>
                <label style={{ fontSize: 13 }}>
                  休憩時間（分）
                  <input type="number" value={editForm.breakTotalMin} onChange={e => setEditForm({ ...editForm, breakTotalMin: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--text)', marginTop: 4, fontSize: 16 }} />
                </label>
                <label style={{ fontSize: 13 }}>
                  勤務場所
                  <select value={editForm.workPlace} onChange={e => setEditForm({ ...editForm, workPlace: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--text)', marginTop: 4, fontSize: 16 }}>
                    <option value="office">出社</option>
                    <option value="remote">在宅</option>
                  </select>
                </label>
                <label style={{ fontSize: 13 }}>
                  備考
                  <textarea value={editForm.note} onChange={e => setEditForm({ ...editForm, note: e.target.value })} rows={2}
                    style={{ display: 'block', width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--text)', marginTop: 4, fontSize: 14, resize: 'vertical' }} />
                </label>
                <label style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--red)' }}>*</span> 修正理由
                  <textarea value={editForm.reason} onChange={e => setEditForm({ ...editForm, reason: e.target.value })} rows={2} placeholder="修正理由を入力してください"
                    style={{ display: 'block', width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--text)', marginTop: 4, fontSize: 14, resize: 'vertical' }} />
                </label>
              </div>

              {message && <div style={{ marginTop: 12, fontSize: 13, color: message.includes('失敗') || message.includes('入力') ? 'var(--red)' : 'var(--green)' }}>{message}</div>}

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => setEditingRecord(null)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--b)',
                  background: 'var(--s2)', color: 'var(--text)', fontSize: 14, cursor: 'pointer',
                }}>キャンセル</button>
                <button onClick={handleSave} disabled={saving} style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: 'var(--acc)', color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                }}>{saving ? '保存中...' : '保存'}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
