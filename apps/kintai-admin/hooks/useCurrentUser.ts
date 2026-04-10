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
    const controller = new AbortController()

    fetch('/api/auth/me', { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(d => {
        if (d.error || !d.user) {
          router.push('/login')
          return
        }
        setUser({ name: d.user.name, role: d.user.role })
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        router.push('/login')
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort()
  }, [router])

  return { user, loading }
}
