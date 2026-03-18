'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { apiGet, apiPost } from '@/lib/api'

type StampStatus = 'none' | 'working' | 'done'
type WorkType    = 'office' | 'remote'

interface StampState {
  inTime:     number | null
  outTime:    number | null
  breakTotal: number
  status:     StampStatus
  workType:   WorkType
}

export default function StampPage() {
  const router = useRouter()
  const [user, setUser]   = useState<{ name: string; role: string; av: string } | null>(null)
  const [clock, setClock] = useState('--:--:--')
  const [date,  setDate]  = useState('')
  const [toast, setToast] = useState<{ msg: string; icon: string } | null>(null)
  const [socialProof, setSocialProof] = useState<{ checkedIn: number; total: number } | null>(null)
  const [stamp, setStamp] = useState<StampState>({
    inTime: null, outTime: null,
    breakTotal: 0, status: 'none', workType: 'office',
  })

  // ── ユーザー取得 ──────────────────────────────────
  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await apiGet('/api/auth/me')
        setUser(data.user)
        sessionStorage.setItem('user', JSON.stringify(data.user))
      } catch {
        router.push('/login')
      }
    }
    loadUser()
  }, [router])

  // ── 時計 ──────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }))
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  // ── 今日の勤務データ取得 ────────────────────────────
  useEffect(() => {
    const loadTodayAttendance = async () => {
      try {
        const data = await apiGet('/api/attendance?range=today')
        const att = data?.attendance
        if (att) {
          setStamp(s => ({
            ...s,
            inTime: att.checkInTime ? new Date(att.checkInTime).getTime() : null,
            outTime: att.checkOutTime ? new Date(att.checkOutTime).getTime() : null,
            breakTotal: att.breakTotalMin || 0,
            status: att.status || 'none',
            workType: att.workPlace || 'office',
          }))
        }
        // ソーシャルプルーフ取得
        if (data?.socialProof) {
          setSocialProof(data.socialProof)
        }
      } catch {
        // Silent fail - use local state default
      }
    }
    loadTodayAttendance()
  }, [])

  // ── トースト ──────────────────────────────────────
  const showToast = (msg: string, icon = '✅') => {
    setToast({ msg, icon })
    setTimeout(() => setToast(null), 2800)
  }

  // ── 打刻処理 ──────────────────────────────────────
  const doStamp = async (type: 'in' | 'remote' | 'out') => {
    const time = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    try {
      let action: string
      let workPlace: 'office' | 'remote' = 'office'
      switch (type) {
        case 'in':
          action = 'in'
          workPlace = 'office'
          showToast(`出勤打刻しました　${time}`, '🏢')
          break
        case 'remote':
          action = 'in'
          workPlace = 'remote'
          showToast(`在宅勤務を開始しました　${time}`, '🏠')
          break
        case 'out':
          action = 'out'
          showToast(`退勤打刻しました　${time}`, '🔴')
          break
        default:
          return
      }
      const response = await apiPost('/api/attendance', { action, workPlace })
      const att = response.attendance
      if (att) {
        setStamp(s => ({
          ...s,
          inTime: att.checkInTime ? new Date(att.checkInTime).getTime() : s.inTime,
          outTime: att.checkOutTime ? new Date(att.checkOutTime).getTime() : s.outTime,
          breakTotal: att.breakTotalMin ?? s.breakTotal,
          status: att.status || s.status,
          workType: att.workPlace || s.workType,
        }))
      }
    } catch (error) {
      showToast('エラーが発生しました', '❌')
    }
  }

  // ── 実働時間計算 ──────────────────────────────────
  const deemedBreak = 60 // みなし休憩控除（分）
  const workMin = stamp.inTime
    ? stamp.outTime
      ? Math.round((stamp.outTime - stamp.inTime) / 60000) - deemedBreak
      : Math.round((Date.now() - stamp.inTime) / 60000) - deemedBreak
    : 0
  const wh = Math.floor(Math.max(0, workMin) / 60)
  const wm = Math.max(0, workMin) % 60

  // ── 時間帯ナッジ（未出勤時） ──────────────────────────
  const getNudgeStyle = () => {
    if (stamp.status !== 'none') return null
    const now = new Date()
    const h = now.getHours()
    const m = now.getMinutes()
    const timeVal = h * 60 + m
    if (timeVal >= 9 * 60 + 15) return { label: '⚠ 遅刻リスク', color: 'var(--red)', bg: 'rgba(248,113,113,.12)' }
    if (timeVal >= 9 * 60) return { label: '出勤してください', color: 'var(--amber)', bg: 'rgba(251,191,36,.12)' }
    return null
  }
  const nudge = getNudgeStyle()

  // ── ステータス表示 ────────────────────────────────
  const statusConf = {
    none:     nudge || { label: '未出勤',   color: 'var(--t3)',     bg: 'rgba(148,163,184,.07)' },
    working:  { label: stamp.workType === 'remote' ? '在宅勤務中' : '勤務中', color: stamp.workType === 'remote' ? 'var(--purple)' : 'var(--green)', bg: stamp.workType === 'remote' ? 'rgba(167,139,250,.1)' : 'rgba(52,211,153,.1)' },
    done:     { label: '退勤済',   color: 'var(--t2)',     bg: 'rgba(148,163,184,.07)' },
  }[stamp.status]

  const canIn     = stamp.status === 'none'
  const canOut    = stamp.status === 'working'

  const fmt = (ts: number | null) =>
    ts ? new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '—'

  if (!user) return null

  return (
    <div style={S.app}>
      <Sidebar active="stamp" />
      <main style={S.main}>
        <div style={S.page}>
          <div style={S.pageTitle}>打刻</div>
          <div style={S.pageSub}>
            {user.name} さん、今日もお疲れ様です
            {socialProof && (
              <span style={{ marginLeft: 8, color: 'var(--acc)', fontWeight: 500 }}>
                — 今日 {socialProof.checkedIn}/{socialProof.total}名が出勤済み
              </span>
            )}
          </div>

          <div style={S.wrap}>
            {/* 時計 */}
            <div style={S.timeDisplay}>
              <div style={S.clock}>{clock}</div>
              <div style={S.clockDate}>{date}</div>
              <div style={{ ...S.statusPill, color: statusConf.color, background: statusConf.bg }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusConf.color, display: 'inline-block', marginRight: 6, animation: stamp.status === 'working' ? 'blink 1.5s infinite' : 'none' }} />
                {statusConf.label}
              </div>
            </div>

            {/* 出勤・在宅・退勤 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <StampBtn icon="🏢" label="出勤"     color="var(--green)"  disabled={!canIn}    onClick={() => doStamp('in')} />
              <StampBtn icon="🏠" label="在宅勤務"  color="var(--purple)" disabled={!canIn}    onClick={() => doStamp('remote')} />
              <StampBtn icon="🔴" label="退勤"     color="var(--red)"    disabled={!canOut}   onClick={() => doStamp('out')} />
            </div>

            {/* 今日のログ */}
            <div style={S.todayLog}>
              <LogRow label="勤務場所" value={stamp.inTime ? (stamp.workType === 'remote' ? '🏠 在宅勤務' : '🏢 出社') : '—'} color={stamp.inTime ? (stamp.workType === 'remote' ? 'var(--purple)' : 'var(--green)') : 'var(--t3)'} />
              <LogRow label="出勤時刻" value={fmt(stamp.inTime)}  color="var(--green)" />
              <LogRow label="退勤時刻" value={fmt(stamp.outTime)} color="var(--red)"   />
              <LogRow label="休憩時間" value={stamp.inTime ? `${deemedBreak}分（みなし）` : '—'} />
              <LogRow label="実働時間" value={stamp.inTime ? `${wh}h ${wm}m` : '—'} color="var(--acc)" last />
            </div>
          </div>
        </div>
      </main>

      {/* トースト */}
      {toast && (
        <div style={S.toast}>
          {toast.icon} {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </div>
  )
}

// ── サブコンポーネント ─────────────────────────────
function StampBtn({ icon, label, color, disabled, onClick }: {
  icon: string; label: string; color: string; disabled: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '16px 8px', borderRadius: 14,
        border: `1.5px solid ${disabled ? 'var(--b)' : color}`,
        background: disabled ? 'transparent' : `${color}18`,
        color: disabled ? 'var(--t3)' : color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        fontSize: 13, fontWeight: 600, opacity: disabled ? 0.35 : 1,
        transition: 'all .15s', minHeight: 72,
        justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      {label}
    </button>
  )
}

function LogRow({ label, value, color, last }: {
  label: string; value: string; color?: string; last?: boolean
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0',
      borderBottom: last ? 'none' : '1px solid rgba(30,45,69,.5)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--t3)' }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', fontWeight: 500, color: color ?? 'var(--t2)' }}>{value}</span>
    </div>
  )
}

// ── スタイル ──────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  app:     { display: 'flex', height: '100vh', overflow: 'hidden' },
  main:    { flex: 1, overflowY: 'auto', background: 'var(--bg)', paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' },
  page:    { padding: '20px 16px' },
  pageTitle:{ fontSize: 20, fontWeight: 700, marginBottom: 4 },
  pageSub: { fontSize: 13, color: 'var(--t2)', marginBottom: 20 },
  wrap:    { maxWidth: 480, margin: '0 auto' },
  timeDisplay: {
    textAlign: 'center', padding: '32px 16px 28px',
    background: 'var(--s1)', border: '1px solid var(--b)',
    borderRadius: 18, marginBottom: 14,
  },
  clock:     { fontFamily: 'DM Mono, monospace', fontSize: 44, fontWeight: 400, letterSpacing: '0.06em', lineHeight: 1 },
  clockDate: { fontSize: 12, color: 'var(--t2)', marginTop: 8 },
  statusPill:{
    display: 'inline-flex', alignItems: 'center', marginTop: 12,
    padding: '5px 14px', borderRadius: 20, fontSize: 12,
    fontFamily: 'DM Mono, monospace', border: '1px solid rgba(255,255,255,.1)',
  },
  todayLog: {
    background: 'var(--s1)', border: '1px solid var(--b)',
    borderRadius: 14, padding: '4px 16px',
  },
  toast: {
    position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)',
    background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 12,
    padding: '12px 20px', fontSize: 13, whiteSpace: 'nowrap',
    boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 999,
  },
}
