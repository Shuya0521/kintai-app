// Next.js Instrumentation — サーバー起動時にセルフpingを開始
// Renderフリープランのスリープ（15分無通信）を防止する

export async function register() {
  if (process.env.NODE_ENV === 'production' && typeof globalThis.setTimeout !== 'undefined') {
    const INTERVAL = 4 * 60 * 1000 // 4分間隔（15分スリープ前に余裕を持つ）
    const APP_URL = process.env.RENDER_EXTERNAL_URL || 'https://kintai-app-3na7.onrender.com'

    const ping = async () => {
      try {
        await fetch(`${APP_URL}/api/health`)
      } catch {
        // ネットワークエラーは無視（次回リトライ）
      }
    }

    // 初回は30秒後（サーバー起動完了を待つ）
    setTimeout(() => {
      ping()
      setInterval(ping, INTERVAL)
    }, 30_000)
  }
}
