'use client'
// The ticket "reveal" — an emotional moment, not a utility screen. Just the
// personalized ticket (it eases in) and a share action at the peak. All the
// practical stuff (status, payment, invites, contact) lives on /mypage.
import Link from 'next/link'
import { useMyAttendee } from '@/lib/use-my-attendee'
import { useTicketShare } from '@/lib/use-ticket-share'
import { displayRole, expectationChars } from '@/lib/ticket'
import TicketCard from '@/components/ticket-card'
import ShareMenu from '@/components/share-menu'
import { Loading, RetryNotice } from '@/components/load-state'

const wrapCls =
  'flex min-h-dvh flex-col items-center justify-center gap-5 px-4 pt-[calc(1.25rem_+_env(safe-area-inset-top))] pb-[calc(1.5rem_+_env(safe-area-inset-bottom))]'

export default function TicketPage() {
  const { user, loading, attendee, loaded, error } = useMyAttendee()
  const { shareLink, shareImage, copied } = useTicketShare(user?.uid, attendee?.ticketNo)

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
        <ShareMenu shareLink={shareLink} shareImage={shareImage} variant="icon" />
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
