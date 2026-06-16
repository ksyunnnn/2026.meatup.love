'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/use-auth'
import { createAttendee } from '@/lib/attendees'

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
        authName: user.displayName ?? user.email ?? user.uid,
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
    return <main style={{ padding: 24 }}>読み込み中…</main>
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.8 }}>
      <h1>参加する</h1>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          名前（編集可）
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          何してるひと？（任意）
          <input value={job} onChange={(e) => setJob(e.target.value)} />
        </label>
        <fieldset style={{ display: 'grid', gap: 4, border: 'none', padding: 0, margin: 0 }}>
          <legend>どっち？（任意）</legend>
          <div style={{ display: 'flex', gap: 16 }}>
            {['男', '女', 'その他'].map((option) => (
              <label key={option} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input
                  type="radio"
                  name="gender"
                  value={option}
                  checked={gender === option}
                  onChange={(e) => setGender(e.target.value)}
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" disabled={submitting} style={{ padding: '8px 16px' }}>
          {submitting ? '送信中…' : '参加する → チケットへ'}
        </button>
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
      </form>
    </main>
  )
}
