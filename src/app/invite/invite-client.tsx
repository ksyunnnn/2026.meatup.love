'use client'

import { useSearchParams, useRouter } from 'next/navigation'

export default function InviteClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const name = searchParams.get('name') ?? ''
  const token = searchParams.get('t') ?? ''

  // TODO(auth cycle): replace this stub with real Firebase Auth
  // (Google / GitHub / email link). For now it simulates "signed in"
  // and forwards the prefill name (+ invite token) to the form.
  function handleSignInStub() {
    const qs = new URLSearchParams()
    if (name) qs.set('name', name)
    if (token) qs.set('t', token)
    router.push(`/register?${qs.toString()}`)
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.8 }}>
      <h1>ようこそ{name ? `、${name} さん` : ''} 🍖</h1>
      <p>meatup 2026 への招待です。サインインして参加に進みます。</p>
      <button onClick={handleSignInStub} style={{ padding: '8px 16px' }}>
        サインイン（仮）→ 参加へ
      </button>
      <p style={{ color: '#888', fontSize: 12 }}>
        ※ スタブ。実際の認証（Google / GitHub / メール）は後続サイクルで実装。
      </p>
    </main>
  )
}
