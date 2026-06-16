'use client'

// TODO(data cycle): load the signed-in user's ticket from Firestore.
export default function TicketPage() {
  const dummy = { name: '佐藤', ticketNo: 'MU-2026-0001', status: 'approved' as const }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.8 }}>
      <h1>🎟 あなたのチケット</h1>
      <div style={{ border: '2px solid #b33c44', borderRadius: 8, padding: 16, maxWidth: 360 }}>
        <p style={{ fontSize: 20, fontWeight: 700 }}>meatup 2026</p>
        <p>{dummy.name} さん</p>
        <p>No. {dummy.ticketNo}</p>
        <p>状態：{dummy.status === 'approved' ? '確定 ✅' : '受付（確認待ち）'}</p>
      </div>
      <p style={{ color: '#888', fontSize: 12 }}>※ ダミーデータ表示。</p>
    </main>
  )
}
