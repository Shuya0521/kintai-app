'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface Dept { id: string; name: string; count: number }
interface Holiday { date: string; name: string; year: number }

const INITIAL_DEPTS: Dept[] = [
  { id: '1', name: '営業部', count: 12 },
  { id: '2', name: '工事部', count: 8 },
  { id: '3', name: 'リフォーム推進部', count: 6 },
  { id: '4', name: '管理部', count: 5 },
]

const card = { background: 'var(--s1)', borderRadius: 12, padding: 20, border: '1px solid var(--b)' }
const btn = (bg: string, color: string, disabled = false) => ({
  padding: '6px 14px', borderRadius: 6, border: 'none', background: disabled ? 'var(--s2)' : bg,
  color: disabled ? 'var(--t3)' : color, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13,
  opacity: disabled ? 0.6 : 1,
})

export default function MasterPage() {
  const { user, loading } = useCurrentUser()
  const [tab, setTab] = useState<'dept' | 'holiday'>('dept')

  // 部署
  const [depts, setDepts] = useState<Dept[]>(INITIAL_DEPTS)
  const [deptInput, setDeptInput] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  // 祝日
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [holDate, setHolDate] = useState('')
  const [holName, setHolName] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [holLoading, setHolLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(''), 3000)
  }

  // 祝日をDBから読み込む
  const loadHolidays = useCallback(async (y: number) => {
    setHolLoading(true)
    try {
      const res = await fetch(`/api/holidays?year=${y}`, { credentials: 'include' })
      const data = await res.json()
      setHolidays(data.holidays || [])
    } catch {
      showToast('祝日の読み込みに失敗しました', 'error')
    } finally {
      setHolLoading(false)
    }
  }, [])

  useEffect(() => { if (tab === 'holiday') loadHolidays(year) }, [tab, year, loadHolidays])

  if (loading || !user) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ color: 'var(--t2)' }}>読み込み中...</div>
    </div>
  )

  // ── 部署操作 ──
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

  // ── 祝日操作 ──
  const addHoliday = async () => {
    if (!holDate || !holName.trim()) return
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: holDate, name: holName.trim() }),
      })
      if (!res.ok) throw new Error()
      setHolDate(''); setHolName('')
      await loadHolidays(year)
      showToast('祝日を追加しました')
    } catch {
      showToast('追加に失敗しました', 'error')
    }
  }

  const deleteHoliday = async (date: string) => {
    try {
      await fetch(`/api/holidays?date=${date}`, { method: 'DELETE', credentials: 'include' })
      setHolidays(p => p.filter(h => h.date !== date))
      showToast('削除しました')
    } catch {
      showToast('削除に失敗しました', 'error')
    }
  }

  // ── 祝日自動取得（サーバー経由で内閣府APIを叩く） ──
  const fetchJapaneseHolidays = async () => {
    setFetching(true)
    try {
      const res = await fetch(`/api/holidays?year=${year}`, {
        method: 'PUT', credentials: 'include',
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || '自動取得に失敗しました')
      }
      const data = await res.json()
      setHolidays(data.holidays || [])
      showToast(`${year}年の祝日 ${data.count}件 を自動取得・登録しました ✨`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '自動取得に失敗しました', 'error')
    } finally {
      setFetching(false)
    }
  }

  const tabStyle = (active: boolean) => ({
    padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
    background: active ? 'var(--acc)' : 'var(--s2)', color: active ? '#fff' : 'var(--t2)',
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar userName={user.name} userRole={user.role} />
      <main style={{ flex: 1, padding: 24 }} className="pb-24 md:pb-6">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>マスタ管理</h1>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button style={tabStyle(tab === 'dept')} onClick={() => setTab('dept')}>部署管理</button>
          <button style={tabStyle(tab === 'holiday')} onClick={() => setTab('holiday')}>祝日管理</button>
        </div>

        {/* ── 部署管理タブ ── */}
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

        {/* ── 祝日管理タブ ── */}
        {tab === 'holiday' && (
          <div style={card}>
            {/* ヘッダー行: 年選択 + 自動取得ボタン */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--t2)' }}>年:</span>
                <select value={year} onChange={e => setYear(Number(e.target.value))}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--text)', fontSize: 16 }}>
                  {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* 自動取得ボタン */}
              <button
                style={{ ...btn('#7c3aed', '#fff', fetching), display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={fetchJapaneseHolidays}
                disabled={fetching}
              >
                {fetching ? '⏳ 取得中...' : `🗓️ ${year}年 祝日を自動取得`}
              </button>

              <span style={{ fontSize: 11, color: 'var(--t3)' }}>※ 内閣府公式データを自動登録</span>
            </div>

            {/* 会社独自休日 手動追加フォーム */}
            <div style={{ background: 'rgba(56,189,248,.06)', border: '1px solid rgba(56,189,248,.2)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--acc)', fontWeight: 600, marginBottom: 8 }}>🏢 会社独自の休日を追加</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input type="date" value={holDate} onChange={e => setHolDate(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--text)', fontSize: 16 }} />
                <input value={holName} onChange={e => setHolName(e.target.value)} placeholder="例: 創業記念日・夏季休暇"
                  onKeyDown={e => e.key === 'Enter' && addHoliday()}
                  style={{ flex: 1, minWidth: 160, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--b)', background: 'var(--s2)', color: 'var(--text)', fontSize: 16 }} />
                <button style={btn('var(--acc)', '#fff')} onClick={addHoliday}>追加</button>
              </div>
            </div>

            {/* 祝日一覧 */}
            {holLoading ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--t2)', fontSize: 13 }}>読み込み中...</div>
            ) : holidays.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--t2)', fontSize: 13 }}>
                {year}年の祝日が未登録です。「祝日を自動取得」ボタンを押してください。
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 8 }}>
                  {year}年 — 合計 {holidays.length}日
                </div>
                {holidays.map(h => (
                  <div key={h.date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--b)' }}>
                    <div>
                      <span style={{ fontSize: 13, color: 'var(--t2)', marginRight: 12, fontFamily: 'monospace' }}>{h.date}</span>
                      <span style={{ fontSize: 14 }}>{h.name}</span>
                    </div>
                    <button style={btn('var(--s2)', 'var(--red)')} onClick={() => deleteHoliday(h.date)}>削除</button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </main>

      {/* トースト通知 */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--s2)', border: `1px solid ${toastType === 'error' ? '#f87171' : 'var(--b2)'}`,
          borderRadius: 12, padding: '12px 20px', fontSize: 13, whiteSpace: 'nowrap',
          boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 999,
        }}>
          {toastType === 'error' ? '❌' : '✅'} {toast}
        </div>
      )}
    </div>
  )
}
