'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/use-auth'
import { signInWithGoogle, signInWithGithub } from '@/lib/auth'
import styles from './invite.module.css'

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
    <main className={styles.wrap}>
      <div className={`card ${styles.card}`}>
        <div className={styles.emoji}>🍖</div>
        <h1 className={styles.title}>
          ようこそ{name ? <>、<span className={styles.name}>{name}</span> さん</> : ''}
        </h1>
        <p className={styles.lead}>meatup 2026 への招待です。サインインして参加に進みます。</p>

        {loading ? (
          <p className={styles.lead}>読み込み中…</p>
        ) : user ? (
          <div className={styles.actions}>
            <p className={styles.signedin}>
              サインイン済み：{user.displayName ?? user.email ?? user.uid}
            </p>
            <button className="btn btn--primary btn--block" onClick={proceedToRegister}>
              参加へ進む →
            </button>
          </div>
        ) : (
          <div className={styles.actions}>
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
