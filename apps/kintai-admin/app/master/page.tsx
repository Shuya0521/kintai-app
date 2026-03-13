'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface Dept { id: string; name: string; count: number }
interface Holiday { id: string; date: string; name: string }

const INITIAL_DEPTS: Dept[] = [
  { id: '1', name: '営業部', count: 12 },
  { id: '2', name: '工事部', count: 8 },
  { id: '3', name: 'リフォーム推進部', count: 6 },
  { id: '4', name: '管理部', count: 5 },
]

const INITIAL_HOLIDAYS: Holiday[] = [
  { id: '1', date: '2026-01-01', name: '元日' },
  { id: '2', date: '2026-01-12', name: '成人の日' },
  { id: '3', date: '2026-02-11', name: '建国記念の日' },
  { id: '4', date: '2026-02-23', name: '天皇誕生日' },
  { id: '5', date: '2026-03-20', name: '春分の日' },
  { id: '6', date: '2026-04-29', name: '昭和の日' },
  { id: '7', date: '2026-05-03', name: '憲法記念日' },
  { id: '8', date: '2026-05-04', name: 'みどりの日' },
  { id: '9', date: '2026-05-05', name: 'こどもの日' },
  { id: '10', date: '2026-07-20', name: '海の日' },
  { id: '11', date: '2026-08-11', name: '山の日' },
  { id: '12', date: '2026-09-21', name: '敬老の日' },
  { id: '13', date: '2026-09-23', name: '秋分の日' },
  { id: '14', date: '2026-10-12', name: 'スポーツの日' },
  { id: '15', date: '2026-11-03', name: '文化の日' },
  { id: '16', date: '2026-11-23', name: '勤労感謝の日' },
]

const card = { background: 'var(--s1)', borderRadius: 12, padding: 20, border: '1px solid var(--b)' }
const btn = (bg: string, color: string) => ({
  padding: '6px 14px', borderRadius: 6, border: 'none', background: bg, color, cursor: 'pointer', fontSize: 13,
})

export default function MasterPage() {
  const router = useRouter()
  const { user, loading } = useCurrentUser()
  const [tab, setTab] = useState<'dept' | 'holiday'>('dept')
  const [depts, setDepts] = useState<Dept[]>(INITIAL_DEPTS)
  const [holidays, setHolidays] = useState<Holiday[]>(INITIAL_HOLIDAYS)
  const [deptInput, setDeptInput] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [holDate, setHolDate] = useState('')
  const [holName, setHolName] = useState('')
  const [year, setYear] = useState(2026)

  if (loading || !user) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ color: 'var(--t2)' }}>読み込み中...</div>
    </div>
  )

  const addDept = () => {
    if (!deptInput.trim()) return
    setDepts(p => [...p, { id: Date.now().toString(), name: deptInput.trim(), count: 0 }])
    setDeptInput('')
  }

  const saveDept = (id: string) => {
    if (!editName.trim()) return
    setDepts(p => p.map(d => d.id === id ? { ...d, name: editName.trim() } : d))
    setEditId(null)
  }

  const addHoliday = () => {
    if (!holDate || !holName.trim()) return
    setHolidays(p => [...p, { id: Date.now().toString(), date: holDate, name: holName.trim() }].sort((a, b) => a.date.localeCompare(b.date)))
    setHolDate(''); setHolName('')
  }

  const filtered = holidays.filter(h => h.date.startsWith(String(year)))

  const tabStyle = (active: boolean) => ({
    padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
    background: active ? 'var(--acc)' : 'var(--s2)', color: active ? '#fff' : 'var(--t2)',
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar userName={user.name} userRole={user.role} />
      <main style={{ flex: 1, padding: 24 }} className="md:ml-[220px] ml-0 pb-24 md:pb-6">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>マスタ管理</h1>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button style={tabStyle(tab === 'dept')} onClick={() => setTab('dept')}>部署管理</button>
          <button style={tabStyle(tab === 'holiday')} onClick={() => setTab('holiday')}>祝日管理</button>
        </div>

        {tab === 'dept' && (
          <div style={card}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <input value={deptInput} onChange={e => setDeptInput(e.target.value)} placeholder="新しい部署名"
                onKeyDown={e => e.key === 'Enter' && addDept()}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--text)', fontSize: 16 }} />
              <button style={btn('var(--acc)', '#fff')} onClick={addDept}>追加</button>
            </div>
            {depts.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--b)' }}>
                {editId === d.id ? (
                  <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveDept(d.id)}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--text)', fontSize: 16 }} />
                    <button style={btn('var(--green)', '#fff')} onClick={() => saveDept(d.id)}>保存</button>
                    <button style={btn('var(--s2)', 'var(--t2)')} onClick={() => setEditId(null)}>取消</button>
                  </div>
                ) : (
                  <>
                    <div>
                      <span style={{ fontSize: 14 }}>{d.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--t2)', marginLeft: 8 }}>{d.count}名</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={btn('var(--s2)', 'var(--acc)')} onClick={() => { setEditId(d.id); setEditName(d.name) }}>編集</button>
                      <button style={btn('var(--s2)', 'var(--red)')} onClick={() => setDepts(p => p.filter(x => x.id !== d.id))}>削除</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'holiday' && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--t2)' }}>年:</span>
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--text)', fontSize: 16 }}>
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <input type="date" value={holDate} onChange={e => setHolDate(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--text)', fontSize: 16 }} />
              <input value={holName} onChange={e => setHolName(e.target.value)} placeholder="祝日名"
                onKeyDown={e => e.key === 'Enter' && addHoliday()}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--text)', fontSize: 16 }} />
              <button style={btn('var(--acc)', '#fff')} onClick={addHoliday}>追加</button>
            </div>
            {filtered.length === 0 && <div style={{ fontSize: 13, color: 'var(--t2)', textAlign: 'center', padding: 20 }}>{year}年の祝日はありません</div>}
            {filtered.map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--b)' }}>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--t2)', marginRight: 12, fontFamily: 'monospace' }}>{h.date}</span>
                  <span style={{ fontSize: 14 }}>{h.name}</span>
                </div>
                <button style={btn('var(--s2)', 'var(--red)')} onClick={() => setHolidays(p => p.filter(x => x.id !== h.id))}>削除</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
