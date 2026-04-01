// ── フロントエンド用 API クライアント ──────────────

export async function api(path: string, options?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
      signal: controller.signal,
    })
    const data = await res.json()
    if (res.status === 401) {
      // セッション切れ → ログイン画面へ
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('セッションが切れました。再ログインしてください。')
    }
    if (!res.ok) throw new Error(data.error || 'エラーが発生しました')
    return data
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('リクエストがタイムアウトしました')
    }
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

export const apiGet = (path: string) => api(path)
export const apiPost = (path: string, body: unknown) =>
  api(path, { method: 'POST', body: JSON.stringify(body) })
export const apiPatch = (path: string, body: unknown) =>
  api(path, { method: 'PATCH', body: JSON.stringify(body) })
