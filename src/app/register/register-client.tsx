'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/use-auth'
import { createAttendee, getMyAttendee } from '@/lib/attendees'
import { JOBS } from '@/lib/profile'

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
  const [withKids, setWithKids] = useState(false)
  const [hasAllergy, setHasAllergy] = useState(false)
  const [allergyNote, setAllergyNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
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
    if (expectations.length === 0) {
      setError('楽しみなやつ、ひとつは選んでね🙏')
      return
    }
    if (!contactMethod) {
      setError('連絡手段を選んでね🙏')
      return
    }
    if (!contactValue.trim()) {
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
        contactMethod,
        contactValue: contactValue.trim(),
        withKids: withKids || undefined,
        hasAllergy: hasAllergy || undefined,
        allergyNote: hasAllergy ? allergyNote.trim() || undefined : undefined,
        inviteToken: token || undefined,
      })
      router.push('/mypage')
    } catch (err) {
      console.error(err)
      setError('うまくいかなかった…！もう登録済みならチケット見てみて。ちょっと時間おいて、またやってみてね🙏')
      setSubmitting(false)
    }
  }

  if (loading || !user || checking) {
    return <main className="flex min-h-dvh items-center justify-center px-4 py-6">読み込み中…</main>
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
                    required
                  />
                  {opt.emoji} {opt.value}
                </label>
              ))}
            </div>
            {contactMethod && (
              <input
                className={inputCls}
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                placeholder={`${contactMethod} のID / ユーザー名`}
                required
              />
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
                placeholder="アレルギーの内容（例：えび・そば）"
              />
            )}
          </fieldset>
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? '送信中…' : '参加する → チケットへ'}
          </button>
          {error && <p className="text-[14px] text-meat-dark">{error}</p>}
        </form>
      </div>
    </main>
  )
}
