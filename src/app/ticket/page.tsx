'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/use-auth'
import { getMyAttendee } from '@/lib/attendees'
import type { Attendee } from '@/lib/types'
import styles from './ticket.module.css'

export default function TicketPage() {
  const { user, loading } = useAuth()
  const [attendee, setAttendee] = useState<Attendee | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [copied, setCopied] = useState(false)

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

  async function handleShare() {
    if (!user || !attendee) return
    const url = `${window.location.origin}/t/${user.uid}`
    const text = `${attendee.name} の meatup 2026 チケット 🍖`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'meatup 2026', text, url })
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
      } catch (err) {
        console.error(err)
      }
    }
  }

  if (loading || (user && !loaded)) {
    return <main className={styles.wrap}>読み込み中…</main>
  }

  if (!user) {
    return (
      <main className={styles.wrap}>
        <p>サインインが必要です。</p>
        <Link className="btn btn--primary" href="/invite">
          招待ページへ
        </Link>
      </main>
    )
  }

  if (!attendee) {
    return (
      <main className={styles.wrap}>
        <p>まだ参加登録がありません。</p>
        <Link className="btn btn--primary" href="/register">
          参加する
        </Link>
      </main>
    )
  }

  const confirmed = attendee.status === 'approved'

  return (
    <main className={styles.wrap}>
      <div className={styles.ticket}>
        <div className={styles.head}>
          <div className={styles.brand}>meatup</div>
          <div className={styles.brandSub}>2026 🍖</div>
        </div>
        <div className={styles.body}>
          <div className={styles.who}>{attendee.name} さん</div>
          <div className={styles.divider} />
          <div className={styles.label}>TICKET No.</div>
          <div className={styles.no}>{attendee.ticketNo}</div>
          <span
            className={`${styles.badge} ${confirmed ? styles.badgeOk : styles.badgeWait}`}
          >
            {confirmed ? '確定 ✅' : '受付（主催者の確認待ち）'}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <button className="btn btn--flame btn--block" onClick={handleShare}>
          {copied ? 'リンクをコピーしました' : 'チケットをシェア 🔗'}
        </button>
        <Link className="btn btn--block" href="/">
          トップへ
        </Link>
      </div>
    </main>
  )
}
