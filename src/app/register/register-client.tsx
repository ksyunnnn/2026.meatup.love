'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function RegisterClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [name, setName] = useState(searchParams.get('name') ?? '')
  const [job, setJob] = useState('')
  const [gender, setGender] = useState('')

  // TODO(data cycle): write to Firestore attendees/{uid} (status pending,
  // or approved when a valid invite token is present), then issue a ticket.
  function handleSubmitStub(e: React.FormEvent) {
    e.preventDefault()
    router.push('/ticket')
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.8 }}>
      <h1>参加登録</h1>
      <form onSubmit={handleSubmitStub} style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          名前（編集可）
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          何してるひと？（任意）
          <input value={job} onChange={(e) => setJob(e.target.value)} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          どっち？（任意）
          <input value={gender} onChange={(e) => setGender(e.target.value)} />
        </label>
        <button type="submit" style={{ padding: '8px 16px' }}>
          登録する（仮）→ チケットへ
        </button>
      </form>
      <p style={{ color: '#888', fontSize: 12 }}>
        ※ スタブ。送信は Firestore 未接続（後続サイクル）。
      </p>
    </main>
  )
}
