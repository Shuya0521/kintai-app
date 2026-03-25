// Next.js Instrumentation — サーバー起動時の初期化処理

export async function register() {
  // Vercelではサーバーレスのためセルフping不要
  // Renderフォールバック用に残す（RENDER_EXTERNAL_URLが設定されている場合のみ）
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.RENDER_EXTERNAL_URL &&
    typeof globalThis.setTimeout !== 'undefined'
  ) {
    const INTERVAL = 4 * 60 * 1000
    const APP_URL = process.env.RENDER_EXTERNAL_URL

    const ping = async () => {
      try { await fetch(`${APP_URL}/api/health`) } catch {}
    }

    setTimeout(() => {
      ping()
      setInterval(ping, INTERVAL)
    }, 30_000)
  }
}
