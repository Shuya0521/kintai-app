'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

interface NavItem {
  label: string
  path: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'ダッシュボード', path: '/', icon: '🏠' },
  { label: '承認管理', path: '/approvals', icon: '✅' },
  { label: '勤怠一覧', path: '/attendance', icon: '📋' },
  { label: 'メンバー', path: '/members', icon: '👥' },
  { label: '残業レポート', path: '/overtime', icon: '📈' },
  { label: 'マスタ管理', path: '/master', icon: '🗂' },
  { label: '設定', path: '/settings', icon: '⚙' },
]

interface AdminSidebarProps {
  userName: string
  userRole: string
}

export default function AdminSidebar({ userName, userRole }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside style={{
        width: 220,
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        background: 'var(--s1)',
        borderRight: '1px solid var(--b)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }} className="hidden md:flex">
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--b)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--acc)' }}>KINTAI</div>
          <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>ADMIN</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                background: isActive(item.path) ? 'var(--acc)' : 'transparent',
                color: isActive(item.path) ? '#fff' : 'var(--t2)',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--b)' }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{userName}</div>
          <div style={{ fontSize: 11, color: 'var(--t2)' }}>{userRole}</div>
          <button
            onClick={handleLogout}
            style={{
              marginTop: 8,
              width: '100%',
              padding: '6px 0',
              border: '1px solid var(--b)',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--t2)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav
        className="md:hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--s1)',
          borderTop: '1px solid var(--b)',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '8px 0',
          paddingBottom: 'calc(8px + var(--safe-bottom))',
          zIndex: 100,
        }}
      >
        {NAV_ITEMS.slice(0, 4).map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              border: 'none',
              background: 'transparent',
              color: isActive(item.path) ? 'var(--acc)' : 'var(--t2)',
              fontSize: 10,
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            border: 'none',
            background: 'transparent',
            color: mobileOpen || NAV_ITEMS.slice(4).some(i => isActive(i.path)) ? 'var(--acc)' : 'var(--t2)',
            fontSize: 10,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          <span style={{ fontSize: 20 }}>☰</span>
          その他
        </button>
      </nav>

      {/* Mobile "More" overlay */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 150,
          }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--s1)',
              borderTop: '1px solid var(--b)',
              borderRadius: '16px 16px 0 0',
              padding: '16px 16px calc(16px + var(--safe-bottom))',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--b)', margin: '0 auto 16px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {NAV_ITEMS.slice(4).map((item) => (
                <button
                  key={item.path}
                  onClick={() => { router.push(item.path); setMobileOpen(false) }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 15,
                    background: isActive(item.path) ? 'var(--acc)' : 'transparent',
                    color: isActive(item.path) ? '#fff' : 'var(--t2)',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <div style={{ height: 1, background: 'var(--b)', margin: '8px 0' }} />
              <div style={{ padding: '4px 14px', fontSize: 13, color: 'var(--t2)' }}>
                {userName} ({userRole})
              </div>
              <button
                onClick={() => { handleLogout(); setMobileOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 15,
                  background: 'transparent',
                  color: 'var(--red)',
                }}
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
