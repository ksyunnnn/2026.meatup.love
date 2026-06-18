'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/use-auth'
import { Oniku } from '@/components/oniku'
import { getMyAttendee } from '@/lib/attendees'
import type { Attendee } from '@/lib/types'
import {
  signInWithGoogle,
  sendEmailSignInLink,
  completeEmailLinkSignIn,
  isInAppBrowser,
} from '@/lib/auth'

export default function InviteClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const name = searchParams.get('name') ?? ''
  const token = searchParams.get('t') ?? ''

  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [inApp, setInApp] = useState(false)
  const [attendee, setAttendee] = useState<Attendee | null>(null)
  const [checkingAttendee, setCheckingAttendee] = useState(true)

  // Detect SNS in-app browser (client only) to suggest opening externally.
  useEffect(() => {
    setInApp(isInAppBrowser())
  }, [])

  // If we arrived back via the email link, finish the sign-in.
  useEffect(() => {
    completeEmailLinkSignIn().catch((err) => {
      console.error(err)
      setEmailError('リンクでのサインインに失敗しました。もう一度お試しください。')
    })
  }, [])

  // Already signed in? Look up their registration so we can route a returning
  // guest to their ticket instead of the (doomed) registration form.
  useEffect(() => {
    if (loading || !user) return
    let active = true
    getMyAttendee(user.uid)
      .then((a) => {
        if (!active) return
        setAttendee(a)
        setCheckingAttendee(false)
      })
      .catch(() => {
        if (active) setCheckingAttendee(false)
      })
    return () => {
      active = false
    }
  }, [loading, user])

  // After auth, carry the prefill name (+ invite token) to the form.
  function proceedToRegister() {
    const qs = new URLSearchParams()
    if (name) qs.set('name', name)
    if (token) qs.set('t', token)
    router.push(`/register?${qs.toString()}`)
  }

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setEmailError('')
    try {
      await sendEmailSignInLink(email.trim())
      setSent(true)
    } catch (err) {
      console.error(err)
      setEmailError('リンクの送信に失敗しました。メールアドレスを確認してください。')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-6">
      <div className="card flex w-full max-w-[380px] flex-col gap-4 text-center">
        <Oniku className="mx-auto h-[60px] w-[60px]" />
        <h1 className="text-[24px] font-extrabold">
          ようこそ{name ? <>、<span className="text-meat">{name}</span> さん</> : ''}
        </h1>
        <p className="text-[15px] text-ink-soft">meatup 2026 への招待です。サインインして参加に進みます。</p>

        {loading ? (
          <p className="text-[15px] text-ink-soft">読み込み中…</p>
        ) : user ? (
          <div className="mt-2 flex flex-col gap-3">
            <p className="text-[14px] text-ink-soft">
              サインイン済み：{user.email ?? user.displayName ?? user.uid}
            </p>
            {checkingAttendee ? (
              <p className="text-[15px] text-ink-soft">読み込み中…</p>
            ) : attendee ? (
              <>
                <p className="text-[15px] text-ink">
                  {attendee.status === 'approved'
                    ? 'もう登録済みだよ！参加確定してる 🎉'
                    : 'もう登録済み！主催の確認待ちだよ'}
                </p>
                <button
                  className="btn btn--primary btn--block"
                  onClick={() => router.push('/mypage')}
                >
                  マイページへ →
                </button>
              </>
            ) : (
              <button className="btn btn--primary btn--block" onClick={proceedToRegister}>
                参加へ進む →
              </button>
            )}
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            {inApp && (
              <p className="rounded-[8px] border border-line bg-cream px-3 py-2 text-[12px] text-ink-soft">
                アプリ内ブラウザではメールのリンクが開けないことがあります。右上のメニューから
                <b>外部ブラウザで開く</b>と確実です。
              </p>
            )}

            <button
              className="btn btn--primary btn--block"
              onClick={() => void signInWithGoogle().catch(console.error)}
            >
              Google でサインイン
            </button>

            <div className="flex items-center gap-3 text-[12px] text-ink-soft">
              <span className="h-px flex-1 bg-line" />
              または
              <span className="h-px flex-1 bg-line" />
            </div>

            {sent ? (
              <p className="rounded-[8px] border border-line bg-cream px-3 py-3 text-[14px] text-ink">
                📧 ログインリンクを <b>{email}</b> に送りました。メールのリンクを開いてサインインを完了してください。
              </p>
            ) : (
              <form onSubmit={handleSendLink} className="flex flex-col gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="メールアドレス"
                  className="w-full min-h-12 rounded-[8px] border-2 border-line bg-white px-4 py-3 text-ink placeholder:text-ink-soft focus:border-meat focus:outline-none"
                />
                <button type="submit" className="btn btn--block" disabled={sending}>
                  {sending ? '送信中…' : 'メールでログインリンクを送る'}
                </button>
              </form>
            )}

            {emailError && <p className="text-[14px] text-meat-dark">{emailError}</p>}
          </div>
        )}
      </div>
    </main>
  )
}
