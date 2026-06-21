'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FirebaseError } from 'firebase/app'
import { useAuth } from '@/lib/use-auth'
import { createAttendee, getMyAttendee } from '@/lib/attendees'
import { JOBS } from '@/lib/profile'
import { CONTACTS } from '@/lib/contacts'
import { LineIcon, InstagramIcon, TwitterIcon } from '@/components/icons'
import { Loading } from '@/components/load-state'

// Map a registration (createAttendee) failure to an honest, cause-specific
// message. createAttendee runs a Firestore transaction, so failures surface as
// FirestoreError codes — a single catch-all ("またやってみてね") hid distinct
// causes (e.g. a rules rejection vs. a flaky network), making field reports
// undiagnosable. Each branch is worded distinctly so the on-screen text alone
// tells which case fired; the raw code is also logged for the console.
function registerErrorMessage(err: unknown): string {
  const code = err instanceof FirebaseError ? err.code : ''
  switch (code) {
    case 'permission-denied':
      // Rules rejected the write — most often the invite path (a bad/expired
      // link, or an invite already used). This is the class that blocked the
      // first invited guest. Steer them to a recoverable next step.
      return '登録がはじかれたみたい…！招待リンクが古いか、すでに使われてるかも。リンクを発行しなおしてもらうか、運営に声かけてね🙏'
    case 'already-exists':
      return 'もう登録済みみたい！チケットを見にいってみてね🎟'
    case 'unavailable':
    case 'deadline-exceeded':
    case 'cancelled':
      return '通信がうまくいかなかったかも。電波のいいとこで、もう一回ためしてね🙏'
    case 'aborted':
    case 'failed-precondition':
      // Transaction lost a race — typically the invite was consumed in parallel.
      return 'ほぼ同時に処理が走ってぶつかったかも。少し待って、もう一回ためしてね🙏'
    case 'resource-exhausted':
      return 'いまアクセスが混みあってるみたい…少し時間をおいてね🙏'
    default:
      return 'うまくいかなかった…！もう登録済みならチケット見てみて。ちょっと時間おいて、またやってみてね🙏'
  }
}

const inputCls =
  'w-full min-h-12 rounded-[8px] border-2 border-line bg-white px-4 py-3 text-ink focus:border-meat focus:outline-none'

// Selectable "chip": a bordered label that turns meat-coloured when its input is
// checked (works for both checkbox and radio). Same look as the gender choices.
const chipCls =
  'flex min-h-12 cursor-pointer select-none items-center justify-center gap-1.5 rounded-[8px] border-2 border-line px-3 font-semibold has-[:checked]:border-meat has-[:checked]:bg-cream has-[:checked]:text-meat'

// What people want from the event (multi-select). Stable keys for aggregation.
const EXPECTATIONS = [
  { key: 'meat', emoji: '🍖', label: '肉' },
  { key: 'drink', emoji: '🍺', label: '酒' },
  { key: 'play', emoji: '🎧', label: '遊び' },
  { key: 'connect', emoji: '🤝', label: '繋がり' },
]

// Reachable contact channels (single-select) + a free-text id/username. Email is
// already captured via auth, so this is a more-reachable handle — all optional.
const CONTACT_METHODS = [
  { value: 'LINE', emoji: '💬' },
  { value: 'Instagram', emoji: '📷' },
  { value: 'Twitter', emoji: '🐦' },
  { value: 'Discord', emoji: '🎮' },
]

// Sentinel for the "add the host's LINE instead" choice — a peer radio that
// stores no contact; the add link is shown on the completion screen after submit.
const LINE_ADD = 'line-add'

export default function RegisterClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const token = searchParams.get('t') ?? ''
  const [name, setName] = useState(searchParams.get('name') ?? '')
  const [expectations, setExpectations] = useState<string[]>([])
  const [job, setJob] = useState(searchParams.get('job') ?? '')
  const [jobOther, setJobOther] = useState('')
  const [contactMethod, setContactMethod] = useState('')
  const [contactValue, setContactValue] = useState('')
  // [B] picks the "add the host's LINE" radio (value LINE_ADD): no contact is
  // stored; the add link is shown on the completion screen after submit.
  const [done, setDone] = useState(false)
  const [withKids, setWithKids] = useState(false)
  const [hasAllergy, setHasAllergy] = useState(false)
  const [allergyNote, setAllergyNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // Raw failure code shown (muted) under the message. A regular user can't open
  // the console, so this makes a single screenshot enough to diagnose which
  // branch fired (e.g. permission-denied). Empty for client-side validation.
  const [errorCode, setErrorCode] = useState('')
  const [checking, setChecking] = useState(true)

  // Require sign-in: send unauthenticated visitors back to the invite page.
  useEffect(() => {
    if (!loading && !user) {
      const qs = new URLSearchParams()
      if (name) qs.set('name', name)
      if (token) qs.set('t', token)
      router.replace(`/invite?${qs.toString()}`)
    }
  }, [loading, user, name, token, router])

  // Already registered? Route to the ticket instead of a re-submit that the
  // rules would reject (a new ticketNo can't overwrite the existing record).
  useEffect(() => {
    if (loading || !user) return
    let active = true
    getMyAttendee(user.uid)
      .then((a) => {
        if (!active) return
        if (a) router.replace('/mypage')
        else setChecking(false)
      })
      .catch(() => {
        if (active) setChecking(false)
      })
    return () => {
      active = false
    }
  }, [loading, user, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setErrorCode('') // validation errors below carry no code; cleared up front
    if (expectations.length === 0) {
      setError('楽しみなやつ、ひとつは選んでね🙏')
      return
    }
    const useLine = contactMethod === LINE_ADD
    if (!contactMethod) {
      setError('連絡手段を選んでね🙏')
      return
    }
    if (!useLine && !contactValue.trim()) {
      setError('連絡先（ID / ユーザー名）を入れてね🙏')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await createAttendee({
        uid: user.uid,
        authName: user.email ?? user.displayName ?? user.uid,
        name,
        expectations,
        job: job || undefined,
        jobOther: job === 'その他' ? jobOther.trim() || undefined : undefined,
        // [B] stores no contact (reachability lives in the LINE friendship);
        // [A] stores the chosen channel + id.
        contactMethod: useLine ? undefined : contactMethod,
        contactValue: useLine ? undefined : contactValue.trim(),
        withKids: withKids || undefined,
        hasAllergy: hasAllergy || undefined,
        allergyNote: hasAllergy ? allergyNote.trim() || undefined : undefined,
        inviteToken: token || undefined,
      })
      // [B] → completion screen (offers the LINE add). [A] → /mypage as before.
      if (useLine) setDone(true)
      else router.push('/mypage')
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : 'unknown'
      console.error('[meatup] register failed', code, err)
      setError(registerErrorMessage(err))
      setErrorCode(code)
      setSubmitting(false)
    }
  }

  if (loading || !user || checking) {
    return <Loading className="flex min-h-dvh items-center justify-center px-4 py-6" />
  }

  // [B] completion screen: the signup is already saved, so offering the LINE add
  // here means opening LINE can never lose the registration.
  if (done) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-6">
        <div className="card w-full max-w-[400px] text-center">
          <h1 className="text-[24px] font-extrabold">うれし〜🎉</h1>
          <p className="mt-3 text-[14px] text-ink-soft">
            最後に、LINE追加よろしゅう！連絡手段ないと詰むので🥹
          </p>
          <a
            href={CONTACTS.line}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--primary btn--block mx-auto mt-5 inline-flex max-w-[320px] items-center justify-center gap-2"
          >
            <LineIcon className="h-[18px] w-[18px]" />
            運営のLINEを追加する
          </a>
          <p className="mt-2 text-[12px] text-ink-soft">これ無理やったらSNSで連絡ほしい！ごめんなさい🙏</p>
          <p className="mt-1 flex items-center justify-center gap-1">
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
          <button
            type="button"
            onClick={() => router.push('/mypage')}
            className="mt-3 text-[13px] font-bold text-ink-soft underline underline-offset-2"
          >
            マイページへ →
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-6">
      <div className="card w-full max-w-[400px]">
        <h1 className="mb-2 text-[24px] font-extrabold">参加する 🍖</h1>
        <p className="mb-6 text-[13px] leading-relaxed text-ink-soft">
          賑やかしに利用したいので回答おねがいしまうす🐭 名前はわかればいいよ！
          連絡手段は運営からの連絡のみに利用するよ！
        </p>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <label className="grid gap-2">
            <span className="text-[15px] font-bold">名前</span>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              required
            />
          </label>
          <fieldset className="grid gap-2 border-0">
            <span className="text-[15px] font-bold">何が楽しみ？</span>
            <div className="grid grid-cols-2 gap-2">
              {EXPECTATIONS.map((opt) => (
                <label key={opt.key} className={chipCls}>
                  <input
                    type="checkbox"
                    value={opt.key}
                    checked={expectations.includes(opt.key)}
                    onChange={(e) =>
                      setExpectations((prev) =>
                        e.target.checked
                          ? [...prev, opt.key]
                          : prev.filter((k) => k !== opt.key),
                      )
                    }
                    className="accent-meat"
                  />
                  {opt.emoji} {opt.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="grid gap-2 border-0">
            <span className="text-[15px] font-bold">何してるひと？</span>
            <div className="grid grid-cols-2 gap-2">
              {JOBS.map((opt) => (
                <label key={opt.value} className={chipCls}>
                  <input
                    type="radio"
                    name="job"
                    value={opt.value}
                    checked={job === opt.value}
                    onChange={(e) => setJob(e.target.value)}
                    className="accent-meat"
                    required
                  />
                  {opt.emoji} {opt.value}
                </label>
              ))}
            </div>
            {job === 'その他' && (
              <input
                className={inputCls}
                value={jobOther}
                onChange={(e) => setJobOther(e.target.value)}
                maxLength={16}
                placeholder="ざっくりでOK！"
              />
            )}
          </fieldset>
          <fieldset className="grid gap-2 border-0">
            <span className="text-[15px] font-bold">運営からの連絡手段</span>
            <div className="grid grid-cols-2 gap-2">
              {CONTACT_METHODS.map((opt) => (
                <label key={opt.value} className={chipCls}>
                  <input
                    type="radio"
                    name="contactMethod"
                    value={opt.value}
                    checked={contactMethod === opt.value}
                    onChange={(e) => setContactMethod(e.target.value)}
                    className="accent-meat"
                  />
                  {opt.emoji} {opt.value}
                </label>
              ))}
            </div>
            {contactMethod && contactMethod !== LINE_ADD && (
              <input
                className={inputCls}
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                maxLength={50}
                placeholder={`${contactMethod} のID / ユーザー名`}
              />
            )}
            <div className="flex items-center gap-3 text-[12px] text-ink-soft">
              <span className="h-px flex-1 bg-line" />
              または
              <span className="h-px flex-1 bg-line" />
            </div>
            {/* [B] add the host's LINE — a peer radio. Stores no contact; the
                add link appears on the completion screen after submit. */}
            <label className={chipCls}>
              <input
                type="radio"
                name="contactMethod"
                value={LINE_ADD}
                checked={contactMethod === LINE_ADD}
                onChange={(e) => setContactMethod(e.target.value)}
                className="accent-meat"
              />
              運営のLINEをこの場で追加
            </label>
            {contactMethod === LINE_ADD && (
              <p className="text-[12px] text-ink-soft">
                ※ 参加ボタンを押したあとに追加リンクが表示されます
              </p>
            )}
          </fieldset>

          <fieldset className="grid gap-2 border-0">
            <span className="text-[15px] font-bold">その他</span>
            <label className="flex items-center gap-2 text-[15px]">
              <input
                type="checkbox"
                checked={withKids}
                onChange={(e) => setWithKids(e.target.checked)}
                className="h-5 w-5 accent-meat"
              />
              子連れの可能性あり
            </label>
            <label className="flex items-center gap-2 text-[15px]">
              <input
                type="checkbox"
                checked={hasAllergy}
                onChange={(e) => setHasAllergy(e.target.checked)}
                className="h-5 w-5 accent-meat"
              />
              アレルギーあり
            </label>
            {hasAllergy && (
              <input
                className={inputCls}
                value={allergyNote}
                onChange={(e) => setAllergyNote(e.target.value)}
                maxLength={100}
                placeholder="アレルギーの内容（例：えび・そば）"
              />
            )}
          </fieldset>
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? '送信中…' : '参加する → チケットへ'}
          </button>
          {error && (
            <div className="space-y-1">
              <p className="text-[14px] text-meat-dark">{error}</p>
              {errorCode && (
                <p className="text-[11px] text-ink-soft/70">
                  （コード: {errorCode}）
                </p>
              )}
            </div>
          )}
        </form>
        <Link
          href="/"
          className="mt-6 block text-center text-[13px] font-bold text-ink-soft underline-offset-2 hover:underline"
        >
          ← トップへ
        </Link>
      </div>
    </main>
  )
}
