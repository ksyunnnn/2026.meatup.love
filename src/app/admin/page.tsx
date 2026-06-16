'use client'

// TODO(data + auth cycle): gate to admin uid; load pending attendees from
// Firestore; wire the "確認しました！" button to set status = approved.
export default function AdminPage() {
  const pending = [
    { uid: 'u1', name: '田中', job: 'デザイナー' },
    { uid: 'u2', name: '鈴木', job: 'エンジニア' },
  ]

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.8 }}>
      <h1>管理：確認待ち</h1>
      <ul style={{ display: 'grid', gap: 8, listStyle: 'none', padding: 0 }}>
        {pending.map((p) => (
          <li key={p.uid} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span>
              {p.name}（{p.job}）
            </span>
            <button style={{ padding: '4px 12px' }}>確認しました！</button>
          </li>
        ))}
      </ul>
      <p style={{ color: '#888', fontSize: 12 }}>
        ※ スタブ。admin限定ゲート・Firestore接続・承認処理は後続サイクル。
      </p>
    </main>
  )
}
