'use client'
// The ticket "reveal" — an emotional moment, not a utility screen. Just the
// personalized ticket (it eases in) and a share action at the peak. All the
// practical stuff (status, payment, invites, contact) lives on /mypage.
import Link from 'next/link'
import { useState } from 'react'
import { useMyAttendee } from '@/lib/use-my-attendee'
import { displayRole, expectationChars } from '@/lib/ticket'
import TicketCard from '@/components/ticket-card'
import { ShareIcon } from '@/components/icons'
import { Loading, RetryNotice } from '@/components/load-state'

const wrapCls =
  'flex min-h-dvh flex-col items-center justify-center gap-5 px-4 pt-[calc(1.25rem_+_env(safe-area-inset-top))] pb-[calc(1.5rem_+_env(safe-area-inset-bottom))]'

export default function TicketPage() {
  const { user, loading, attendee, loaded, error } = useMyAttendee()
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (!user || !attendee) return
    const origin = window.location.origin
    const url = `${origin}/t/${user.uid}`
    const text = `Meatup2026に参加します🍖 #meatup2026 ${origin}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'meatup 2026', text, url })
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error(err)
      }
    }
  }

  if (error && !loaded) {
    return <RetryNotice className={wrapCls} />
  }
  if (loading || (user && !loaded)) {
    return <Loading className={wrapCls} />
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

  const role = displayRole(attendee.job, attendee.jobOther)
  const chars = expectationChars(attendee.expectations)
  const shareUrl = `${window.location.origin}/t/${user.uid}`

  return (
    <main className={wrapCls}>
      <div className="flex w-full max-w-[540px] items-center justify-between">
        <Link
          className="text-[13px] font-bold text-ink-soft underline-offset-2 hover:underline"
          href="/mypage"
        >
          ← マイページ
        </Link>
        <button
          type="button"
          onClick={handleShare}
          aria-label="チケットをシェア"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-meat transition-colors hover:bg-cream active:scale-95"
        >
          <ShareIcon className="h-[22px] w-[22px]" />
        </button>
      </div>

      <div className="ticket-reveal w-full">
        <div className="mx-auto flex max-w-[540px] justify-center">
          <TicketCard
            name={attendee.name}
            role={role}
            chars={chars}
            ticketNo={attendee.ticketNo ?? ''}
            shareUrl={shareUrl}
          />
        </div>
      </div>

      <p
        className={
          'text-[13px] font-bold text-ink-soft transition-opacity ' +
          (copied ? 'opacity-100' : 'opacity-0')
        }
        aria-live="polite"
      >
        リンクをコピーしました ✓
      </p>
    </main>
  )
}
