'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/use-auth'
import { createAttendee } from '@/lib/attendees'
import styles from './register.module.css'

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
    return <main className={styles.wrap}>読み込み中…</main>
  }

  return (
    <main className={styles.wrap}>
      <div className={`card ${styles.card}`}>
        <h1 className={styles.title}>参加する 🍖</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>名前（編集可）</span>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>何してるひと？（任意）</span>
            <input
              className={styles.input}
              value={job}
              onChange={(e) => setJob(e.target.value)}
            />
          </label>
          <fieldset className={styles.field} style={{ border: 'none' }}>
            <span className={styles.label}>どっち？（任意）</span>
            <div className={styles.radios}>
              {['男', '女', 'その他'].map((option) => (
                <label key={option} className={styles.radio}>
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
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? '送信中…' : '参加する → チケットへ'}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      </div>
    </main>
  )
}
