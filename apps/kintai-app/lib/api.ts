// ── フロントエンド用 API クライアント ──────────────

export async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'エラーが発生しました')
  return data
}

export const apiGet = (path: string) => api(path)
export const apiPost = (path: string, body: unknown) =>
  api(path, { method: 'POST', body: JSON.stringify(body) })
export const apiPatch = (path: string, body: unknown) =>
  api(path, { method: 'PATCH', body: JSON.stringify(body) })
