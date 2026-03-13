/**
 * SQLite バックアップユーティリティ
 *
 * VACUUM INTO を使用して安全にバックアップを作成する。
 * ファイルコピーだとWALモードで不整合が起きるため、VACUUM INTOが推奨。
 *
 * バッチスケジュール: 毎日 03:00
 * 保持期間: 30世代（約1ヶ月分）
 */

import { prisma } from '../db'
import * as fs from 'fs'
import * as path from 'path'

const DEFAULT_BACKUP_DIR = path.resolve(__dirname, '../../../../backup')
const MAX_GENERATIONS = 30

/**
 * SQLiteデータベースのバックアップを作成
 *
 * @param backupDir バックアップ保存先ディレクトリ（デフォルト: プロジェクトルート/backup/）
 */
export async function createBackup(backupDir?: string): Promise<{
  success: boolean
  filePath?: string
  error?: string
}> {
  const dir = backupDir || DEFAULT_BACKUP_DIR

  try {
    // バックアップディレクトリ作成
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // ファイル名: kintai_YYYYMMDD_HHMMSS.db
    const now = new Date()
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '_',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('')

    const backupFileName = `kintai_${timestamp}.db`
    const backupPath = path.join(dir, backupFileName)

    // VACUUM INTO でバックアップ（WALモード対応の安全な方法）
    // パスのサニタイズ（SQLインジェクション防止）
    const sanitizedPath = backupPath.replace(/\\/g, '/').replace(/'/g, "''")
    if (sanitizedPath.includes('..') || sanitizedPath.includes(';')) {
      throw new Error('不正なバックアップパスです')
    }
    await prisma.$executeRawUnsafe(`VACUUM INTO '${sanitizedPath}'`)

    console.log(`[Backup] Created: ${backupPath}`)

    // 古い世代を削除
    await cleanupOldBackups(dir)

    return { success: true, filePath: backupPath }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[Backup] Failed:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * MAX_GENERATIONS を超える古いバックアップを削除
 */
async function cleanupOldBackups(dir: string): Promise<void> {
  try {
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('kintai_') && f.endsWith('.db'))
      .sort()
      .reverse()

    // MAX_GENERATIONS を超えた分を削除
    const toDelete = files.slice(MAX_GENERATIONS)
    for (const file of toDelete) {
      const filePath = path.join(dir, file)
      fs.unlinkSync(filePath)
      console.log(`[Backup] Deleted old backup: ${file}`)
    }

    if (toDelete.length > 0) {
      console.log(`[Backup] Cleaned up ${toDelete.length} old backups`)
    }
  } catch (err) {
    console.error('[Backup] Cleanup failed:', err)
  }
}
