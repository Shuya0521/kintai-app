'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // ログイン済みかチェック → 打刻画面へ、未ログインならログイン画面へ
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) {
          router.replace('/stamp')
        } else {
          sessionStorage.removeItem('user')
          router.replace('/login')
        }
      })
      .catch(() => {
        router.replace('/login')
      })
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080c14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        color: '#94a3b8',
        fontSize: '14px',
        fontFamily: "'Noto Sans JP', sans-serif",
      }}>
        読み込み中...
      </div>
    </div>
  )
}
