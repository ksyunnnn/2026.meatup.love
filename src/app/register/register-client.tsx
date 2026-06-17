'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/use-auth'
import { createAttendee, getMyAttendee } from '@/lib/attendees'

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

// Coarse job buckets (single-select) — kept broad so counts stay meaningful.
const JOBS = [
  { value: 'エンジニア', emoji: '🧑‍💻' },
  { value: 'クリエイティブ', emoji: '🎨' },
  { value: 'ビジネス', emoji: '📈' },
  { value: '経営・フリーランス', emoji: '🧑‍💼' },
  { value: '学生', emoji: '🎓' },
  { value: 'その他', emoji: '🙂' },
]

export default function RegisterClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const token = searchParams.get('t') ?? ''
  const [name, setName] = useState(searchParams.get('name') ?? '')
  const [expectations, setExpectations] = useState<string[]>([])
  const [job, setJob] = useState('')
  const [jobOther, setJobOther] = useState('')
  const [gender, setGender] = useState('')
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
        if (a) router.replace('/ticket')
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
        gender: gender || undefined,
        inviteToken: token || undefined,
      })
      router.push('/ticket')
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
        <h1 className="mb-6 text-[24px] font-extrabold">参加する 🍖</h1>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <label className="grid gap-2">
            <span className="text-[15px] font-bold">名前（編集可）</span>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <fieldset className="grid gap-2 border-0">
            <span className="text-[15px] font-bold">何が楽しみ？（複数OK）</span>
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
            <span className="text-[15px] font-bold">どっち？</span>
            <div className="flex gap-2">
              {['男', '女', 'その他'].map((option) => (
                <label
                  key={option}
                  className="flex min-h-12 flex-1 cursor-pointer select-none items-center justify-center gap-2 rounded-[8px] border-2 border-line font-semibold has-[:checked]:border-meat has-[:checked]:bg-cream has-[:checked]:text-meat"
                >
                  <input
                    type="radio"
                    name="gender"
                    value={option}
                    checked={gender === option}
                    onChange={(e) => setGender(e.target.value)}
                    className="accent-meat"
                    required
                  />
                  {option}
                </label>
              ))}
            </div>
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
