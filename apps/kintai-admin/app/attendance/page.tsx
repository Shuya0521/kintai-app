'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import { formatMinToHHMM } from '@kintai/shared'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface Summary {
  employeeNumber: string
  name: string
  department: string
  workDays: number
  remoteDays: number
  remoteAllowanceDays: number
  paidLeaveDays: number
  specialLeaveDays: number
  absentDays: number
  lateEarlyMin: number
  overtimeMin: number
  holidayWorkDays: number
  totalDays: number
}

export default function AttendancePage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ month })
    if (department) params.set('department', department)
    fetch(`/api/attendance?${params}`)
      .then(r => r.json())
      .then(d => {
        setSummaries(d.summaries || [])
      })
      .catch(err => {
        console.error('勤怠データ取得エラー:', err)
        setSummaries([])
      })
      .finally(() => setLoading(false))
  }, [month, department])

  const changeMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const handleExcelExport = async () => {
    setExporting(true)
    try {
      const [y, m] = month.split('-').map(Number)
      const res = await fetch('/api/excel/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: y, month: m, department: department || undefined }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Excel出力に失敗しました')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `勤怠一覧表_${y}年${String(m).padStart(2, '0')}月.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Excel出力に失敗しました')
    } finally {
      setExporting(false)
    }
  }

  if (!user) return null

  const [year, mon] = month.split('-').map(Number)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar userName={user.name} userRole={user.role} />
      <main style={{ flex: 1, padding: 24 }} className="pb-24 md:pb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>全社員 勤怠一覧</h1>
          <button
            onClick={handleExcelExport}
            disabled={exporting || loading}
            style={{
              padding: '8px 20px',
              background: exporting ? 'var(--s2)' : '#22c55e',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: exporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: exporting ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {exporting ? (
              <>
                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                出力中...
              </>
            ) : (
              <>📥 Excel出力</>
            )}
          </button>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            style={{
              padding: '6px 12px', background: 'var(--s2)', border: '1px solid var(--b)',
              borderRadius: 6, color: 'var(--text)', fontSize: 16,
            }}
          >
            <option value="">全部署</option>
            <option value="営業部">営業部</option>
            <option value="工事部">工事部</option>
            <option value="リフォーム推進部">リフォーム推進部</option>
            <option value="管理部">管理部</option>
          </select>
        </div>

        {/* Spinner animation */}
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        {/* Table */}
        <div style={{ overflowX: 'auto', background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--b)' }}>
                {['社員番号', '氏名', '出勤', '在宅', '有休', '特休', '遅早', '残業', '休出', '合計'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: h === '氏名' ? 'left' : 'center',
                    color: 'var(--t2)', fontWeight: 500, fontSize: 12, whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>読み込み中...</td></tr>
              ) : summaries.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>データがありません</td></tr>
              ) : (
                summaries.map((s) => (
                  <tr key={s.employeeNumber} style={{ borderBottom: '1px solid var(--b)' }}>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace', color: 'var(--t2)' }}>
                      {s.employeeNumber}
                    </td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{s.name}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{s.workDays}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--purple)' }}>{s.remoteDays || '-'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--green)' }}>{s.paidLeaveDays || '-'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{s.specialLeaveDays || '-'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace' }}>{formatMinToHHMM(s.lateEarlyMin)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace', color: s.overtimeMin > 45 * 60 ? 'var(--red)' : undefined }}>{formatMinToHHMM(s.overtimeMin)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{s.holidayWorkDays || '-'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>{s.totalDays}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {summaries.length > 0 && (
          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--t2)' }}>
            全社平均出勤率: {Math.round(summaries.reduce((s, r) => s + r.totalDays, 0) / summaries.length * 100) / 100}日
            / 平均残業: {formatMinToHHMM(Math.round(summaries.reduce((s, r) => s + r.overtimeMin, 0) / summaries.length))}
            / 残業警告: {summaries.filter(s => s.overtimeMin > 45 * 60).length}名
          </div>
        )}
      </main>
    </div>
  )
}
