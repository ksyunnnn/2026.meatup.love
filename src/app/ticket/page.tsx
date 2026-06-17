'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/use-auth'
import { getMyAttendee } from '@/lib/attendees'
import type { Attendee } from '@/lib/types'

const wrapCls =
  'flex min-h-dvh flex-col items-center justify-center gap-4 px-4 pt-[calc(1.5rem_+_env(safe-area-inset-top))] pb-[calc(1.5rem_+_env(safe-area-inset-bottom))]'

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
    return <main className={wrapCls}>読み込み中…</main>
  }

  if (!user) {
    return (
      <main className={wrapCls}>
        <p>サインインが必要です。</p>
        <Link className="btn btn--primary" href="/invite">
          招待ページへ
        </Link>
      </main>
    )
  }

  if (!attendee) {
    return (
      <main className={wrapCls}>
        <p>まだ参加登録がありません。</p>
        <Link className="btn btn--primary" href="/register">
          参加する
        </Link>
      </main>
    )
  }

  const confirmed = attendee.status === 'approved'

  return (
    <main className={wrapCls}>
      <div className="w-full max-w-[360px] rounded-[22px] border-[3px] border-ink bg-paper shadow-card-lg">
        <div className="rounded-t-[19px] bg-meat px-6 py-4 text-center text-white">
          <div className="font-[family-name:var(--font-display)] text-[30px] leading-none">meatup</div>
          <div className="font-[family-name:var(--font-display)] text-[16px] opacity-90">2026 🍖</div>
        </div>
        <div className="grid gap-3 p-6 text-center">
          <div className="text-[26px] font-extrabold">{attendee.name} さん</div>
          <div className="relative my-3 h-0 border-t-2 border-dashed border-line before:absolute before:top-[-13px] before:left-[-15px] before:h-6 before:w-6 before:rounded-full before:bg-cream before:content-[''] after:absolute after:top-[-13px] after:right-[-15px] after:h-6 after:w-6 after:rounded-full after:bg-cream after:content-['']" />
          <div className="text-[12px] tracking-[0.12em] text-ink-soft">TICKET No.</div>
          <div className="text-[22px] font-extrabold tracking-[0.06em] tabular-nums text-meat">{attendee.ticketNo}</div>
          <span
            className={
              'justify-self-center inline-flex items-center gap-1 rounded-pill px-4 py-1 text-[14px] font-bold ' +
              (confirmed
                ? 'bg-meat text-white'
                : 'border border-line bg-cream text-ink-soft')
            }
          >
            {confirmed ? '確定 ✅' : '受付（主催者の確認待ち）'}
          </span>
        </div>
      </div>

      <div className="flex w-full max-w-[360px] flex-col gap-3">
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
