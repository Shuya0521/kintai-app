/**
 * kintai-admin起動時にバッチ処理スケジューラを初期化
 *
 * Next.js の instrumentation（server起動時に1回実行）から呼び出す。
 */

import { initScheduler } from '@kintai/shared/src/batch/scheduler'

let cronInitialized = false

export function startCronJobs() {
  if (cronInitialized) return
  cronInitialized = true

  // 本番環境のみcron起動（開発中はコメントアウト可能）
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true') {
    initScheduler()
    console.log('[kintai-admin] Cron jobs started')
  } else {
    console.log('[kintai-admin] Cron jobs skipped (development mode). Set ENABLE_CRON=true to enable.')
  }
}
