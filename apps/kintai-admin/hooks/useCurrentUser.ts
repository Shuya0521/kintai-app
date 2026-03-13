'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export interface CurrentUser {
  name: string
  role: string
}

interface UseCurrentUserResult {
  user: CurrentUser | null
  loading: boolean
}

/**
 * 認証済みユーザー情報を取得するカスタムフック。
 * 未認証の場合は /login にリダイレクトする。
 */
export function useCurrentUser(): UseCurrentUserResult {
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          router.push('/login')
          return
        }
        setUser({ name: d.user.name, role: d.user.role })
      })
      .catch(() => {
        router.push('/login')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [router])

  return { user, loading }
}
