/** 分数を "HH:MM" 形式にフォーマット */
export function formatMinToHHMM(min: number): string {
  if (min <= 0) return '0:00'
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

/** 分数を "Xh Ym" 形式にフォーマット */
export function formatMinToHumanReadable(min: number): string {
  if (min <= 0) return '0m'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** ISO日時文字列を "HH:MM" にフォーマット（JST表示） */
export function formatTimeFromISO(isoString: string | null): string {
  if (!isoString) return '--'
  const d = new Date(isoString)
  // #6: UTC→JSTに変換して表示
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`
}

/** YYYY-MM-DD を "M月D日(曜日)" にフォーマット */
export function formatDateJP(dateStr: string): string {
  // #6: YYYY-MM-DD をローカル時刻としてパース（UTCズレ防止）
  const [y, mo, d] = dateStr.split('-').map(Number)
  const date = new Date(y, mo - 1, d)
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${mo}月${d}日(${days[date.getDay()]})`
}

/** YYYY-MM-DD を "YYYY年M月D日(曜日)" にフォーマット */
export function formatDateFullJP(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const date = new Date(y, mo - 1, d)
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${y}年${mo}月${d}日(${days[date.getDay()]})`
}

/** YYYY-MM-DD 形式で今日の日付を返す（日本時間 JST = UTC+9） */
export function getTodayStr(): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/** ユーザー名をフルネームで返す */
export function formatUserName(user: { lastName: string; firstName: string }): string {
  return `${user.lastName} ${user.firstName}`
}
