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
    <main className="flex min-h-dvh items-center justify-center px-4 py-6">
      <div className="card flex w-full max-w-[380px] flex-col gap-4 text-center">
        <div className="text-[48px] leading-none">🍖</div>
        <h1 className="text-[24px] font-extrabold">
          ようこそ{name ? <>、<span className="text-meat">{name}</span> さん</> : ''}
        </h1>
        <p className="text-[15px] text-ink-soft">meatup 2026 への招待です。サインインして参加に進みます。</p>

        {loading ? (
          <p className="text-[15px] text-ink-soft">読み込み中…</p>
        ) : user ? (
          <div className="mt-2 flex flex-col gap-3">
            <p className="text-[14px] text-ink-soft">
              サインイン済み：{user.displayName ?? user.email ?? user.uid}
            </p>
            <button className="btn btn--primary btn--block" onClick={proceedToRegister}>
              参加へ進む →
            </button>
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            <button
              className="btn btn--primary btn--block"
              onClick={() => void signInWithGoogle().catch(console.error)}
            >
              Google でサインイン
            </button>
            <button
              className="btn btn--block"
              onClick={() => void signInWithGithub().catch(console.error)}
            >
              GitHub でサインイン
            </button>
            <p className="muted">※ メールでのサインインは後日追加予定。</p>
          </div>
        )}
      </div>
    </main>
  )
}
