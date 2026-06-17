'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/use-auth'
import { getMyAttendee } from '@/lib/attendees'
import { createInvite, listMyInvites, INVITE_QUOTA, type InviteWithToken } from '@/lib/invites'
import type { Attendee } from '@/lib/types'
import { CONTACTS, PAYPAY_URL, FEE } from '@/lib/contacts'
import { LineIcon, InstagramIcon, TwitterIcon } from '@/components/icons'

const wrapCls =
  'flex min-h-dvh flex-col items-center justify-center gap-4 px-4 pt-[calc(1.5rem_+_env(safe-area-inset-top))] pb-[calc(1.5rem_+_env(safe-area-inset-bottom))]'

function inviteUrl(inv: InviteWithToken): string {
  const qs = new URLSearchParams()
  if (inv.name) qs.set('name', inv.name)
  qs.set('t', inv.token)
  return `${window.location.origin}/invite?${qs.toString()}`
}

export default function TicketPage() {
  const { user, loading } = useAuth()
  const [attendee, setAttendee] = useState<Attendee | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [copied, setCopied] = useState(false)

  // FR9: invite slots for confirmed attendees.
  const [myInvites, setMyInvites] = useState<InviteWithToken[]>([])
  const [inviteName, setInviteName] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

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

  // Load the attendee's own invites once they are confirmed.
  useEffect(() => {
    if (!user || attendee?.status !== 'approved') return
    let active = true
    listMyInvites(user.uid).then((list) => {
      if (active) setMyInvites(list)
    })
    return () => {
      active = false
    }
  }, [user, attendee?.status])

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
  const remaining = Math.max(0, INVITE_QUOTA - myInvites.length)

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

      <section className="w-full max-w-[360px] rounded-[14px] border-2 border-line bg-paper p-5 text-center">
        <h2 className="text-[16px] font-extrabold">参加費</h2>
        <p className="mt-1 text-[26px] font-extrabold text-meat">
          {FEE.regular.toLocaleString()}円
        </p>
        <p className="text-[13px] text-ink-soft">
          🉐 {FEE.earlyDeadline}までの事前PayPayなら {FEE.early.toLocaleString()}円
        </p>
        {PAYPAY_URL && (
          <a
            href={PAYPAY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--primary btn--block mt-3"
          >
            PayPayで事前に払う
          </a>
        )}
        <p className="mt-3 text-[13px] text-ink-soft">
          当日は PayPay か 現金でもOK。
        </p>
        <p className="mt-2 text-[14px]">払ったら、ひとこと連絡ちょうだい🙏</p>
        <a
          href={CONTACTS.line}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--block mt-2 inline-flex items-center justify-center gap-2"
        >
          <LineIcon className="h-[18px] w-[18px]" />
          LINEで連絡する
        </a>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-1 text-[12px] text-ink-soft">
          他でもOK →
          <a
            href={CONTACTS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram で連絡"
            className="inline-flex h-11 w-11 items-center justify-center text-[#E4405F] transition-colors hover:text-meat"
          >
            <InstagramIcon className="h-[22px] w-[22px]" />
          </a>
          <a
            href={CONTACTS.twitter}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter で連絡"
            className="inline-flex h-11 w-11 items-center justify-center text-[#1DA1F2] transition-colors hover:text-meat"
          >
            <TwitterIcon className="h-[22px] w-[22px]" />
          </a>
        </p>
      </section>

      {confirmed && (
        <section className="w-full max-w-[360px]">
          <h2 className="mb-1 text-center text-[16px] font-extrabold">
            招待枠（残り {remaining} / {INVITE_QUOTA}）
          </h2>
          <p className="mb-3 text-center text-[12px] text-ink-soft">
            友達を招待できます。招待された人は主催の確認後に確定します。
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
    </main>
  )
}
