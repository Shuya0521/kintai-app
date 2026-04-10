// Next.js Instrumentation — サーバー起動時の初期化処理

export async function register() {
  // Turso DBのスキーマを自動修正（prisma migrate deployがdriverAdaptersで動かないため）
  if (process.env.TURSO_DATABASE_URL) {
    try {
      const { prisma } = await import('@kintai/shared')
      // stampCorrectionId カラムが存在しなければ追加
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Approval" ADD COLUMN "stampCorrectionId" TEXT`
      ).catch(() => {}) // 既に存在する場合はエラーを無視
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "Approval_stampCorrectionId_key" ON "Approval"("stampCorrectionId")`
      ).catch(() => {})
      // StampCorrection テーブルが存在しなければ作成
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "StampCorrection" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "attendanceId" TEXT NOT NULL,
          "checkInTime" DATETIME,
          "checkOutTime" DATETIME,
          "breakTotalMin" INTEGER,
          "workPlace" TEXT,
          "note" TEXT,
          "reason" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "StampCorrection_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `).catch(() => {})
      console.log('[Instrumentation] Turso DB schema check completed')
    } catch (e) {
      console.error('[Instrumentation] DB schema check failed:', e)
    }
  }

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
