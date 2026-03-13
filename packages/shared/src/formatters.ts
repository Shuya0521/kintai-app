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

/** ISO日時文字列を "HH:MM" にフォーマット */
export function formatTimeFromISO(isoString: string | null): string {
  if (!isoString) return '--'
  const d = new Date(isoString)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** YYYY-MM-DD を "M月D日(曜日)" にフォーマット */
export function formatDateJP(dateStr: string): string {
  const d = new Date(dateStr)
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`
}

/** YYYY-MM-DD を "YYYY年M月D日(曜日)" にフォーマット */
export function formatDateFullJP(dateStr: string): string {
  const d = new Date(dateStr)
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`
}

/** YYYY-MM-DD 形式で今日の日付を返す */
export function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** ユーザー名をフルネームで返す */
export function formatUserName(user: { lastName: string; firstName: string }): string {
  return `${user.lastName} ${user.firstName}`
}
