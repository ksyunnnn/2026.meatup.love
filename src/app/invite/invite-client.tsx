'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/use-auth'
import { Oniku } from '@/components/oniku'
import { InstagramIcon, TwitterIcon } from '@/components/icons'
import { CONTACTS } from '@/lib/contacts'
import { getMyAttendee } from '@/lib/attendees'
import type { Attendee } from '@/lib/types'
import {
  signInWithGoogle,
  sendEmailSignInLink,
  completeEmailLinkSignIn,
  isInAppBrowser,
  signOutUser,
} from '@/lib/auth'
import { FirebaseError } from 'firebase/app'

// Map a sign-in-link send failure to an honest message. The generic "check your
// email" hides real causes — most notably the daily quota (auth/quota-exceeded),
// which on the Spark plan is only 5 emails/day.
function sendLinkErrorMessage(err: unknown): string {
  const code = err instanceof FirebaseError ? err.code : ''
  switch (code) {
    case 'auth/quota-exceeded':
      return 'いまメール送信が混み合っています。少し時間をおくか、上の Google でサインインしてね🙏'
    case 'auth/invalid-email':
      return 'メールアドレスの形式を確認してね🙏'
    case 'auth/network-request-failed':
      return '通信がうまくいかなかったかも。電波を確かめて、もう一度ためしてね🙏'
    default:
      return 'リンクの送信に失敗しました。少し時間をおいて、もう一度ためしてね🙏'
  }
}

export default function InviteClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const name = searchParams.get('name') ?? ''
  const token = searchParams.get('t') ?? ''
  const job = searchParams.get('job') ?? ''

  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [inApp, setInApp] = useState(false)
  const [attendee, setAttendee] = useState<Attendee | null>(null)
  const [checkingAttendee, setCheckingAttendee] = useState(true)

  // Detect SNS in-app browser, client-only and post-mount: the server (static
  // export) can't know the UA, so initializing in render would cause a hydration
  // mismatch. The one-shot setState here is intentional — silence the lint.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (job) qs.set('job', job)
    if (token) qs.set('t', token)
    router.push(`/register?${qs.toString()}`)
  }

  // Signed in as the wrong account? Sign out so this page falls back to the
  // sign-in choices — i.e. switch accounts. Reset the attendee lookup so the
  // next account is re-checked cleanly.
  async function handleSwitchAccount() {
    try {
      await signOutUser()
      setAttendee(null)
      setCheckingAttendee(true)
    } catch (err) {
      console.error(err)
    }
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
      setEmailError(sendLinkErrorMessage(err))
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
        <p className="text-[15px] text-ink-soft">meatup 2026 へようこそ！サインインして参加登録おなしゃす。</p>

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
                    ? 'もう登録済みやでい！当日楽しみにしてる 🎉'
                    : 'もう登録済み！運営から連絡はきた？'}
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
            <button
              type="button"
              onClick={handleSwitchAccount}
              className="text-[13px] text-ink-soft underline-offset-2 hover:underline"
            >
              別のアカウントに切り替える
            </button>
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
        {/* Pre-auth fallback: if sign-in fails (e.g. email quota), give a way to
            reach the host. IG/X only — LINE stays members-only (prank deterrent). */}
        <p className="flex flex-wrap items-center justify-center gap-x-1 text-[12px] text-ink-soft">
          うまくいかない時はこちら →
          <a
            href={CONTACTS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram で連絡"
            className="inline-flex h-11 w-11 items-center justify-center text-[#E4405F] transition-colors hover:text-meat"
          >
            <InstagramIcon className="h-[22px] w-[22px]" />
          </a>
          <a
            href={CONTACTS.twitter}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter で連絡"
            className="inline-flex h-11 w-11 items-center justify-center text-[#1DA1F2] transition-colors hover:text-meat"
          >
            <TwitterIcon className="h-[22px] w-[22px]" />
          </a>
        </p>
      </div>
    </main>
  )
}
