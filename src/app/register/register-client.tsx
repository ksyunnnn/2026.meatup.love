'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/use-auth'
import { createAttendee } from '@/lib/attendees'

const inputCls =
  'w-full min-h-12 rounded-[8px] border-2 border-line bg-white px-4 py-3 text-ink focus:border-meat focus:outline-none'

export default function RegisterClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const token = searchParams.get('t') ?? ''
  const [name, setName] = useState(searchParams.get('name') ?? '')
  const [job, setJob] = useState('')
  const [gender, setGender] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Require sign-in: send unauthenticated visitors back to the invite page.
  useEffect(() => {
    if (!loading && !user) {
      const qs = new URLSearchParams()
      if (name) qs.set('name', name)
      if (token) qs.set('t', token)
      router.replace(`/invite?${qs.toString()}`)
    }
  }, [loading, user, name, token, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError('')
    try {
      await createAttendee({
        uid: user.uid,
        authName: user.email ?? user.displayName ?? user.uid,
        name,
        job: job || undefined,
        gender: gender || undefined,
        inviteToken: token || undefined,
      })
      router.push('/ticket')
    } catch (err) {
      console.error(err)
      setError('保存に失敗しました。時間をおいて再度お試しください。')
      setSubmitting(false)
    }
  }

  if (loading || !user) {
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
          <label className="grid gap-2">
            <span className="text-[15px] font-bold">何してるひと？（任意）</span>
            <input
              className={inputCls}
              value={job}
              onChange={(e) => setJob(e.target.value)}
            />
          </label>
          <fieldset className="grid gap-2 border-0">
            <span className="text-[15px] font-bold">どっち？（任意）</span>
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
