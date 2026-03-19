'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface QuickUser {
  id: string
  name: string
  email: string
  password: string
  department: string
  role: string
  avatar: string
}

export default function LoginPage() {
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [quickUsers, setQuickUsers] = useState<QuickUser[]>([])

  useEffect(() => {
    const theme = localStorage.getItem('kintai-theme')
    if (theme) document.documentElement.setAttribute('data-theme', theme)

    const saved = localStorage.getItem('kintai_app_email')
    if (saved) {
      setEmail(saved)
      setRemember(true)
    }
    fetch('/api/auth/quicklogin')
      .then(r => r.json())
      .then(data => setQuickUsers(data.users || []))
      .catch(() => {})
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    if (remember) {
      localStorage.setItem('kintai_app_email', email)
    } else {
      localStorage.removeItem('kintai_app_email')
    }

    if (!email.trim() || !password.trim()) {
      setError('メールアドレスとパスワードを入力してください')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'ログインに失敗しました')
        setLoading(false)
        return
      }

      sessionStorage.setItem('user', JSON.stringify(data.user))
      router.push('/stamp')
    } catch (err) {
      setError('通信エラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <div style={S.wrap}>
      <div style={S.box}>
        <div style={S.logo}>KINTAI</div>
        <div style={S.title}>ログイン</div>
        <div style={S.sub}>メールアドレスとパスワードを入力してください</div>

        {error && <div style={S.error}>{error}</div>}

        <label style={S.label}>メールアドレス</label>
        <input
          style={S.input}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="example@company.com"
          autoComplete="email"
        />

        <label style={S.label}>パスワード</label>
        <input
          style={S.input}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--t2)', cursor: 'pointer', marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--acc)' }}
          />
          メールアドレスを記憶する
        </label>

        <button
          style={{ ...S.loginBtn, opacity: loading ? 0.7 : 1 }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>

        <div style={S.registerLink}>
          アカウントをお持ちでないですか？{' '}
          <span style={S.link} onClick={() => router.push('/register')}>
            新規登録
          </span>
        </div>

        {quickUsers.length > 0 && (
          <div style={S.quickSection}>
            <div style={S.quickTitle}>ワンクリックログイン</div>
            <div style={S.quickCards}>
              {quickUsers.map(u => (
                <div
                  key={u.id}
                  style={S.quickCard}
                  onClick={() => { setEmail(u.email); setPassword(u.password) }}
                >
                  <div style={{ ...S.quickAvatar, backgroundColor: ['#38bdf8','#a78bfa','#34d399','#fbbf24','#fb923c'][quickUsers.indexOf(u) % 5] }}>
                    {u.avatar}
                  </div>
                  <div style={S.quickInfo}>
                    <div style={S.quickName}>{u.name}</div>
                    <div style={S.quickEmail}>{u.email}</div>
                    <div style={S.quickDept}>{u.department} / {u.role}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={S.quickHint}>カードをタップすると自動入力されます</div>
          </div>
        )}
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: 'var(--bg)',
    color: 'var(--text)',
    padding: '24px 16px',
  },
  box: {
    width: '100%', maxWidth: 380, background: 'var(--s1)', border: '1px solid var(--b)',
    borderRadius: 20, padding: '40px 24px 32px',
    boxShadow: '0 4px 20px rgba(99,102,241,.08)',
  },
  logo: {
    fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: 13,
    color: 'var(--acc)', letterSpacing: '0.14em', marginBottom: 6,
  },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  sub:   { fontSize: 13, color: 'var(--t2)', marginBottom: 28 },
  error: {
    background: 'color-mix(in srgb, var(--red) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--red) 20%, transparent)',
    borderRadius: 8, padding: '10px 14px', fontSize: 12,
    color: 'var(--red)', marginBottom: 14,
  },
  label: {
    fontSize: 12, color: 'var(--t2)', marginBottom: 6, display: 'block',
    fontFamily: 'var(--font-inter), Inter, sans-serif', letterSpacing: '0.04em',
  },
  input: {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)',
    borderRadius: 10, padding: '13px 14px', color: 'var(--text)',
    fontSize: 16,
    outline: 'none', marginBottom: 16,
    boxSizing: 'border-box' as const,
  },
  loginBtn: {
    width: '100%', padding: 15, borderRadius: 12, border: 0,
    background: 'linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 85%, black))',
    color: '#ffffff', fontSize: 15,
    fontWeight: 700, cursor: 'pointer', marginTop: 4,
    transition: 'opacity .2s',
    boxShadow: '0 4px 14px color-mix(in srgb, var(--acc) 30%, transparent)',
  },
  registerLink: {
    textAlign: 'center', fontSize: 13, color: 'var(--t3)', marginTop: 20,
  },
  link: {
    color: 'var(--acc)', cursor: 'pointer', fontWeight: 600,
  },
  quickSection: {
    marginTop: 24, paddingTop: 20,
    borderTop: '1px solid var(--b)',
  },
  quickTitle: {
    fontSize: 12, color: 'var(--t3)', marginBottom: 12,
    fontFamily: 'var(--font-inter), Inter, sans-serif', letterSpacing: '0.04em', textAlign: 'center',
  },
  quickCards: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  quickCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', borderRadius: 12,
    backgroundColor: 'var(--s2)', border: '1px solid var(--b)',
    cursor: 'pointer', transition: 'all 0.15s ease',
    WebkitTapHighlightColor: 'transparent',
  },
  quickAvatar: {
    width: 40, height: 40, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#ffffff', fontWeight: 700, fontSize: 15, flexShrink: 0,
  },
  quickInfo: {
    display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0,
  },
  quickName: {
    fontSize: 14, fontWeight: 600, color: 'var(--text)',
  },
  quickEmail: {
    fontSize: 11, color: 'var(--acc)', fontFamily: 'var(--font-inter), Inter, sans-serif',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  quickDept: {
    fontSize: 11, color: 'var(--t2)',
  },
  quickHint: {
    fontSize: 10, color: 'var(--t3)', textAlign: 'center', marginTop: 10,
  },
}
