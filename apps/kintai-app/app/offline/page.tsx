'use client'

export default function OfflinePage() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)', color: 'var(--text)',
      flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 56 }}>📡</div>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>オフラインです</h1>
      <p style={{ fontSize: 14, color: 'var(--t2)', maxWidth: 300, lineHeight: 1.6 }}>
        インターネットに接続できません。<br />
        接続が回復したら自動的に復帰します。
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 12, padding: '12px 32px', borderRadius: 12,
          border: '1px solid var(--b2)', background: 'var(--s2)',
          color: 'var(--acc)', fontSize: 14, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        再読み込み
      </button>
    </div>
  )
}
