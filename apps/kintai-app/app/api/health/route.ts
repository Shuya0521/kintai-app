// ヘルスチェックAPI — Renderコールドスタート防止用
// 外部cronサービスから5分毎にpingされる軽量エンドポイント
export const runtime = 'nodejs'

export async function GET() {
  return Response.json({ status: 'ok', ts: Date.now() })
}
