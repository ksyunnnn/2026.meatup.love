'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/use-auth'
import { getMyAttendee } from '@/lib/attendees'
import type { Attendee } from '@/lib/types'

export default function TicketPage() {
  const { user, loading } = useAuth()
  const [attendee, setAttendee] = useState<Attendee | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    let active = true
    getMyAttendee(user.uid).then((a) => {
      if (!active) return
      setAttendee(a)
      setLoaded(true)
    })
    return () => {
      active = false
    }
  }, [loading, user])

  if (loading) {
    return <main style={{ padding: 24 }}>読み込み中…</main>
  }

  if (!user) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.8 }}>
        <p>サインインが必要です。</p>
        <Link href="/invite">招待ページへ</Link>
      </main>
    )
  }

  if (!loaded) {
    return <main style={{ padding: 24 }}>読み込み中…</main>
  }

  if (!attendee) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.8 }}>
        <p>まだ参加登録がありません。</p>
        <Link href="/register">参加する</Link>
      </main>
    )
  }

  const confirmed = attendee.status === 'approved'
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.8 }}>
      <h1>🎟 あなたのチケット</h1>
      <div style={{ border: '2px solid #b33c44', borderRadius: 8, padding: 16, maxWidth: 360 }}>
        <p style={{ fontSize: 20, fontWeight: 700 }}>meatup 2026</p>
        <p>{attendee.name} さん</p>
        <p>No. {attendee.ticketNo}</p>
        <p>状態：{confirmed ? '確定 ✅' : '受付（主催者の確認待ち）'}</p>
      </div>
    </main>
  )
}
