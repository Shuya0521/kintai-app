'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'

const NAV = [
  { id: 'stamp',    href: '/stamp',             icon: '⏱', label: '打刻' },
  { id: 'daily',    href: '/employee/daily',     icon: '📅', label: '日次一覧' },
  { id: 'monthly',  href: '/employee/monthly',   icon: '📊', label: '月次サマリ' },
  { id: 'requests', href: '/employee/requests',  icon: '📋', label: '申請' },
]

export default function Sidebar({ active }: { active: string }) {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; role: string; av: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showLogout, setShowLogout] = useState(false)

  useEffect(() => {
    try {
      const u = sessionStorage.getItem('user')
      if (u) {
        const parsed = JSON.parse(u)
        const name = parsed.name || `${parsed.lastName || ''} ${parsed.firstName || ''}`.trim() || '?'
        setUser({ name, role: parsed.role || '', av: name[0] || '?' })
      }
    } catch {
      // sessionStorage unavailable (private browsing etc.)
    }
  }, [])

  // ── resize は debounce して不要な再レンダリングを防止 ──
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const check = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setIsMobile(window.innerWidth <= 768)
      }, 150)
    }
    // 初回は即座に判定
    setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('resize', check)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleLogout = useCallback(() => {
    fetch('/api/auth/logout', { method: 'POST' })
      .finally(() => {
        try { sessionStorage.removeItem('user') } catch { /* private browsing */ }
        router.push('/login')
      })
  }, [router])

  const logoutModal = showLogout && (
    <div style={S.modalOverlay} onClick={() => setShowLogout(false)}>
      <div style={{ ...S.modalBox, ...(isMobile ? { width: 'calc(100vw - 48px)', maxWidth: 320 } : {}) }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⏻</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>ログアウトしますか？</div>
        <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 24 }}>{user?.name} さん</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button style={S.btnCancel} onClick={() => setShowLogout(false)}>キャンセル</button>
          <button style={S.btnLogout} onClick={handleLogout}>ログアウト</button>
        </div>
      </div>
    </div>
  )

  // ── デスクトップ用サイドバー（常にレンダリング、CSSで表示制御） ──
  const desktopSidebar = (
    <aside style={S.sidebar} className="sidebar-desktop">
      <div style={S.logo}>
        KINTAI
        <span style={S.logoSub}>勤怠管理システム</span>
      </div>

      <nav style={S.nav}>
        {NAV.map(n => (
          <Link
            key={n.id}
            href={n.href}
            prefetch={true}
            style={{ ...S.item, ...(active === n.id ? S.itemActive : {}), textDecoration: 'none' }}
          >
            <span style={S.icon}>{n.icon}</span>
            <span style={{ flex: 1 }}>{n.label}</span>
          </Link>
        ))}
      </nav>

      <div style={S.userBtn} onClick={() => setMenuOpen(o => !o)}>
        <div style={S.avatar}>{user?.av ?? '?'}</div>
        <div style={{ flex: 1 }}>
          <div style={S.userName}>{user?.name}</div>
          <div style={S.userRole}>{user?.role}</div>
        </div>
        <span style={{ fontSize: 9, color: 'var(--t3)', transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▲</span>
      </div>

      <div style={{ ...S.logoutMenu, maxHeight: menuOpen ? 60 : 0 }}>
        <div style={S.logoutItem} onClick={() => { setMenuOpen(false); setShowLogout(true) }}>
          <span>⏻</span> ログアウト
        </div>
      </div>
    </aside>
  )

  // ── モバイル用フッター（常にレンダリング、CSSで表示制御） ──
  const mobileFooter = (
    <nav style={M.bottomBar} className="sidebar-mobile">
      {NAV.map(n => (
        <Link
          key={n.id}
          href={n.href}
          prefetch={true}
          style={{ ...M.tab, color: active === n.id ? 'var(--acc)' : 'var(--t3)', textDecoration: 'none' }}
        >
          <span style={M.tabIcon}>{n.icon}</span>
          <span style={M.tabLabel}>{n.label}</span>
        </Link>
      ))}
      <button
        style={{ ...M.tab, color: 'var(--t3)' }}
        onClick={() => setShowLogout(true)}
      >
        <span style={M.tabIcon}>⏻</span>
        <span style={M.tabLabel}>その他</span>
      </button>
    </nav>
  )

  // ── CSS-only レスポンシブ: 常に両方レンダリングし、CSSで切り替え ──
  return (
    <>
      {desktopSidebar}
      {mobileFooter}
      {logoutModal}
    </>
  )
}

// ── モバイルスタイル ──────────────────────────────────
const M: Record<string, React.CSSProperties> = {
  bottomBar: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    background: 'var(--s1)', borderTop: '1px solid var(--b)',
    paddingBottom: 'env(safe-area-inset-bottom, 8px)',
    paddingTop: 8, zIndex: 100, height: 'auto',
  },
  tab: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 3, padding: '8px 0', minWidth: 64, cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    border: 'none',
    background: 'none',
    font: 'inherit',
  },
  tabIcon: { fontSize: 26, lineHeight: 1 },
  tabLabel: { fontSize: 11, fontWeight: 500 },
}

// ── デスクトップスタイル ──────────────────────────────
const S: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 220, flexShrink: 0, background: 'var(--s1)',
    borderRight: '1px solid var(--b)', display: 'flex',
    flexDirection: 'column', height: '100vh',
    position: 'fixed', top: 0, left: 0, zIndex: 50,
  },
  logo: {
    padding: '22px 20px 16px', borderBottom: '1px solid var(--b)',
    fontFamily: 'DM Mono, monospace', fontSize: 11,
    color: 'var(--acc)', letterSpacing: '0.12em',
  },
  logoSub: { display: 'block', fontSize: 9, color: 'var(--t3)', marginTop: 3, letterSpacing: '0.06em' },
  nav: { flex: 1, padding: '12px 10px', overflowY: 'auto' },
  item: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
    marginBottom: 2, fontSize: 13, color: 'var(--t2)', transition: 'background .15s, color .15s',
  },
  itemActive: { background: 'rgba(56,189,248,.1)', color: 'var(--acc)' },
  icon: { fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 },
  userBtn: {
    padding: '14px 16px', borderTop: '1px solid var(--b)',
    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
  },
  avatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--acc), var(--purple))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, color: '#0a0f1e', flexShrink: 0,
  },
  userName: { fontSize: 12, fontWeight: 500 },
  userRole: { fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono, monospace' },
  logoutMenu: {
    borderTop: '1px solid var(--b)', overflow: 'hidden',
    transition: 'max-height .25s ease',
  },
  logoutItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 18px', cursor: 'pointer',
    fontSize: 13, color: 'var(--red)',
  },
  modalOverlay: {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    background: 'var(--s1)', border: '1px solid var(--b)',
    borderRadius: 18, padding: '32px 28px', width: 320, textAlign: 'center',
  },
  btnCancel: {
    padding: 11, borderRadius: 10, border: '1px solid var(--b2)',
    background: 'var(--s2)', color: 'var(--t2)', fontSize: 13,
    fontWeight: 600, cursor: 'pointer',
  },
  btnLogout: {
    padding: 11, borderRadius: 10, border: '1px solid rgba(248,113,113,.3)',
    background: 'rgba(248,113,113,.1)', color: 'var(--red)', fontSize: 13,
    fontWeight: 600, cursor: 'pointer',
  },
}
