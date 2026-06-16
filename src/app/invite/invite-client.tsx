'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/use-auth'
import { signInWithGoogle, signInWithGithub } from '@/lib/auth'

export default function InviteClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const name = searchParams.get('name') ?? ''
  const token = searchParams.get('t') ?? ''

  // After auth, carry the prefill name (+ invite token) to the form.
  function proceedToRegister() {
    const qs = new URLSearchParams()
    if (name) qs.set('name', name)
    if (token) qs.set('t', token)
    router.push(`/register?${qs.toString()}`)
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.8 }}>
      <h1>ようこそ{name ? `、${name} さん` : ''} 🍖</h1>
      <p>meatup 2026 への招待です。サインインして参加に進みます。</p>

      {loading ? (
        <p>読み込み中…</p>
      ) : user ? (
        <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
          <p>サインイン済み：{user.displayName ?? user.email ?? user.uid}</p>
          <button onClick={proceedToRegister} style={{ padding: '8px 16px' }}>
            参加へ進む →
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
          <button onClick={() => void signInWithGoogle().catch(console.error)} style={{ padding: '8px 16px' }}>
            Google でサインイン
          </button>
          <button onClick={() => void signInWithGithub().catch(console.error)} style={{ padding: '8px 16px' }}>
            GitHub でサインイン
          </button>
          <p style={{ color: '#888', fontSize: 12 }}>
            ※ メールリンクは次の手順（B1.5）で追加予定。
          </p>
        </div>
      )}
    </main>
  )
}
