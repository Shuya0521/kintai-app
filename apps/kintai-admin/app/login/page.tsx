'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('kintai_admin_email')
    if (saved) {
      setEmail(saved)
      setRemember(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (remember) {
      localStorage.setItem('kintai_admin_email', email)
    } else {
      localStorage.removeItem('kintai_admin_email')
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'ログインに失敗しました')
        return
      }

      router.push('/')
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: 20,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'var(--s1)',
        borderRadius: 16,
        padding: 32,
        border: '1px solid var(--b)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--acc)' }}>KINTAI</h1>
          <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4 }}>管理者ログイン</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--s2)',
                border: '1px solid var(--b)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 16,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--s2)',
                border: '1px solid var(--b)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 16,
                outline: 'none',
              }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--t2)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--acc)' }}
            />
            メールアドレスを記憶する
          </label>

          {error && (
            <div style={{
              padding: '10px 12px',
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 8,
              color: 'var(--red)',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 0',
              background: 'var(--acc)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
