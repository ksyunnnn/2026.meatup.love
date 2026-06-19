'use client'
// Functional home (post-login). Calm, glanceable: status, payment, details,
// invites, contact — and one inviting CTA into the *emotional* ticket reveal
// (/ticket). The ticket has no operational job here, so the practical stuff
// lives on this page and the ticket stays a pure "open it" moment.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMyAttendee } from '@/lib/use-my-attendee'
import { signOutUser } from '@/lib/auth'
import { createInvite, listMyInvites, INVITE_QUOTA, type InviteWithToken } from '@/lib/invites'
import { EVENT } from '@/lib/event'
import { FeeSection, ContactSection } from '@/components/member-info'
import { RetryNotice } from '@/components/load-state'

const wrapCls =
  'flex min-h-dvh flex-col items-center gap-4 px-4 pt-[calc(2rem_+_env(safe-area-inset-top))] pb-[calc(2rem_+_env(safe-area-inset-bottom))]'

function inviteUrl(inv: InviteWithToken): string {
  const qs = new URLSearchParams()
  if (inv.name) qs.set('name', inv.name)
  qs.set('t', inv.token)
  return `${window.location.origin}/invite?${qs.toString()}`
}

export default function MyPage() {
  const { user, loading, attendee, loaded, error } = useMyAttendee()
  const router = useRouter()

  const [myInvites, setMyInvites] = useState<InviteWithToken[]>([])
  const [inviteName, setInviteName] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    if (!user || attendee?.status !== 'approved') return
    let active = true
    listMyInvites(user.uid)
      .then((list) => {
        if (active) setMyInvites(list)
      })
      .catch((err) => console.warn('[meatup] listMyInvites failed', err))
    return () => {
      active = false
    }
  }, [user, attendee?.status])

  async function handleIssueInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setIssuing(true)
    try {
      await createInvite(user.uid, inviteName.trim() || undefined)
      setInviteName('')
      setMyInvites(await listMyInvites(user.uid))
    } catch (err) {
      console.error(err)
    } finally {
      setIssuing(false)
    }
  }

  async function handleCopyInvite(url: string, token: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(token)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleLogout() {
    try {
      await signOutUser()
      router.push('/')
    } catch (err) {
      console.error(err)
    }
  }

  if (error && !loaded) {
    return <RetryNotice className={wrapCls + ' justify-center'} />
  }
  if (loading || (user && !loaded)) {
    return <main className={wrapCls + ' justify-center'}>読み込み中…</main>
  }
  if (!user) {
    return (
      <main className={wrapCls + ' justify-center'}>
        <p>サインインが必要です。</p>
        <Link className="btn btn--primary" href="/invite">
          招待ページへ
        </Link>
      </main>
    )
  }
  if (!attendee) {
    return (
      <main className={wrapCls + ' justify-center'}>
        <p>まだ参加登録がありません。</p>
        <Link className="btn btn--primary" href="/register">
          参加する
        </Link>
      </main>
    )
  }

  const confirmed = attendee.status === 'approved'
  const remaining = Math.max(0, INVITE_QUOTA - myInvites.length)

  return (
    <main className={wrapCls}>
      <header className="flex flex-col items-center gap-6 text-center">
        {/* Eyebrow = the brand wordmark lockup (same as the top page), marking
            this as a meatup 2026 membership — not a generic route label. */}
        <p className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] leading-none">
          <span className="text-[22px] tracking-[0.02em] text-ink">
            meat<span className="text-meat">up</span>
          </span>
          <span className="rounded-pill bg-meat px-2.5 py-0.5 text-[12px] text-white">
            2026
          </span>
        </p>
        {/* こばしゅ's block: the name+email pair (tightest) and the status they
            care about sit together, set apart from the brand eyebrow above by the
            header's gap. Nesting + ascending gaps (4 < 12 < 24px) carry the
            hierarchy with whitespace alone — no margins. */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-[34px] font-extrabold leading-tight">{attendee.name}</h1>
            {user.email && <p className="text-[13px] text-ink-soft">{user.email}</p>}
          </div>
          {/* Status, not action: a colored dot + label reads as a passive state,
              no border/pill so it can't be mistaken for an outline button. */}
          <p
            className={
              'inline-flex items-center gap-2 text-[14px] font-bold ' +
              (confirmed ? 'text-meat' : 'text-ink-soft')
            }
          >
            <span
              aria-hidden
              className={'h-2 w-2 rounded-full ' + (confirmed ? 'bg-meat' : 'bg-gold')}
            />
            {confirmed ? '参加確定' : '運営の確認待ち'}
          </p>
        </div>
      </header>

      {/* The inviting way into the emotional ticket reveal. */}
      <Link className="btn btn--primary btn--block max-w-[320px]" href="/ticket">
        チケットを見る 🎟
      </Link>

      <section className="w-full max-w-[540px] rounded-[14px] border-2 border-line bg-paper p-5 text-center">
        <h2 className="text-[16px] font-extrabold">日時・場所</h2>
        <p className="mt-3 font-[family-name:var(--font-display)] text-[18px] tracking-[0.04em]">
          {EVENT.date}
        </p>
        <p className="text-[13px] text-ink-soft">{EVENT.hours}</p>
        <p className="mt-2 text-[15px] font-bold">{EVENT.venue}</p>
        <p className="text-[13px] text-ink-soft">{EVENT.address}</p>
      </section>

      {confirmed && (
        <section className="w-full max-w-[540px]">
          <h2 className="mb-1 text-center text-[16px] font-extrabold">
            招待枠（残り {remaining} / {INVITE_QUOTA}）
          </h2>
          <p className="mb-3 text-center text-[12px] text-ink-soft">
            友達を招待できます。招待された人は運営の確認後に確定します。
          </p>
          <form onSubmit={handleIssueInvite} className="mb-3 flex items-center gap-2">
            <input
              className="min-h-11 min-w-0 flex-1 rounded-[8px] border-2 border-line bg-white px-3 py-2 text-ink placeholder:text-ink-soft focus:border-meat focus:outline-none"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="相手の名前（任意）"
            />
            <button
              type="submit"
              className="btn btn--primary min-h-10 whitespace-nowrap px-4 py-2"
              disabled={issuing || remaining === 0}
            >
              {issuing ? '発行中…' : '発行'}
            </button>
          </form>
          {myInvites.length === 0 ? (
            <p className="text-center text-[13px] text-ink-soft">まだ招待していません。</p>
          ) : (
            <ul className="grid list-none gap-2">
              {myInvites.map((inv) => (
                <li
                  key={inv.token}
                  className="flex items-center gap-3 rounded-[8px] border border-line bg-paper px-4 py-3"
                >
                  <span className="min-w-0">
                    {inv.name ?? '（名前なし）'}
                    <span className="ml-2 text-[12px] text-ink-soft">
                      {inv.usedBy ? '使用済み' : '未使用'}
                    </span>
                  </span>
                  <button
                    className="btn ml-auto min-h-10 whitespace-nowrap px-4 py-2"
                    onClick={() => handleCopyInvite(inviteUrl(inv), inv.token)}
                    disabled={!!inv.usedBy}
                  >
                    {copiedToken === inv.token ? 'コピー済み' : 'リンクをコピー'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <FeeSection approved={confirmed} paid={attendee.paid} />
      <ContactSection />

      <div className="flex flex-col items-center gap-2">
        <Link
          className="text-[13px] font-bold text-ink-soft underline-offset-2 hover:underline"
          href="/"
        >
          ← トップへ
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="text-[12px] text-ink-soft/70 underline-offset-2 hover:underline"
        >
          ログアウト
        </button>
      </div>
    </main>
  )
}
