import { redirect } from 'next/navigation'

/**
 * ルートページ — 打刻画面へ即座にリダイレクト
 *
 * middlewareが認証チェック済みのため、ここに到達した時点で
 * ログイン済みが確定。クライアント側のAPI呼び出しを省略して
 * サーバーサイドで即座にリダイレクトすることで初回表示を高速化。
 */
export default function Home() {
  redirect('/stamp')
}
