// ── フロントエンド用 API クライアント ──────────────

export async function api(path: string, options?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
      signal: controller.signal,
    })
    const data = await res.json()
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
