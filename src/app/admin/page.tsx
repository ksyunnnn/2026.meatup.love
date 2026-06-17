'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/use-auth'
import {
  isAdmin,
  listAttendees,
  approveAttendee,
  type AttendeeWithId,
} from '@/lib/attendees'
import { createInvite, listInvites, type InviteWithToken } from '@/lib/invites'
import type { AttendeeStatus } from '@/lib/types'

const STATUS_LABEL: Record<AttendeeStatus, string> = {
  pending: '受付（確認待ち）',
  approved: '確定 ✅',
  rejected: '却下',
}

const wrapCls = 'mx-auto grid max-w-[560px] gap-6 px-4 pb-6 pt-[calc(1.5rem_+_env(safe-area-inset-top))]'
const sectionCls = 'grid gap-3'
const h2Cls = 'text-[18px] font-extrabold'
const listCls = 'grid list-none gap-2'
const rowCls = 'flex items-center gap-3 rounded-[8px] border border-line bg-paper px-4 py-3'
const subCls = 'ml-2 text-[12px] text-ink-soft'
const btnSm = 'min-h-10 whitespace-nowrap px-4 py-2'
const emptyCls = 'text-[14px] text-ink-soft'

function inviteUrl(inv: InviteWithToken): string {
  const qs = new URLSearchParams()
  if (inv.name) qs.set('name', inv.name)
  qs.set('t', inv.token)
  return `${window.location.origin}/invite?${qs.toString()}`
}

export default function AdminPage() {
  const { user, loading } = useAuth()
  const [admin, setAdmin] = useState(false)
  const [checked, setChecked] = useState(false)
  const [attendees, setAttendees] = useState<AttendeeWithId[]>([])
  const [invites, setInvites] = useState<InviteWithToken[]>([])
  const [inviteName, setInviteName] = useState('')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user) return
    let active = true
    isAdmin(user.uid)
      .then(async (ok) => {
        if (!active) return
        setAdmin(ok)
        if (ok) {
          const [a, i] = await Promise.all([listAttendees(), listInvites()])
          if (!active) return
          setAttendees(a)
          setInvites(i)
        }
        setChecked(true)
      })
      .catch((err) => {
        console.error(err)
        if (active) setChecked(true)
      })
    return () => {
      active = false
    }
  }, [loading, user])

  async function handleApprove(uid: string) {
    if (!user) return
    setBusy(uid)
    try {
      await approveAttendee(uid, user.uid)
      setAttendees((prev) =>
        prev.map((p) => (p.id === uid ? { ...p, status: 'approved' } : p)),
      )
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(null)
    }
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setCreating(true)
    try {
      await createInvite(user.uid, inviteName.trim() || undefined)
      setInviteName('')
      const list = await listInvites()
      setInvites(list)
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  async function handleCopy(url: string, token: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(token)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading || (user && !checked)) {
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

  if (!admin) {
    return (
      <main className={wrapCls}>
        <p>このページは主催者専用です。</p>
      </main>
    )
  }

  const pending = attendees.filter((a) => a.status === 'pending')

  return (
    <main className={wrapCls}>
      <h1 className="text-[26px] font-extrabold">管理 🍖</h1>

      <section className={sectionCls}>
        <h2 className={h2Cls}>確認待ち（{pending.length}）</h2>
        {pending.length === 0 ? (
          <p className={emptyCls}>確認待ちはありません。</p>
        ) : (
          <ul className={listCls}>
            {pending.map((p) => (
              <li key={p.id} className={rowCls}>
                <span className="min-w-0">
                  {p.name}
                  {p.job ? `（${p.job}）` : ''}
                  <span className={subCls}>No. {p.ticketNo}</span>
                  {p.connection ? <span className={subCls}>経由: {p.connection}</span> : ''}
                </span>
                <button
                  className={`btn btn--primary ml-auto ${btnSm}`}
                  onClick={() => handleApprove(p.id)}
                  disabled={busy === p.id}
                >
                  {busy === p.id ? '確認中…' : '確認しました！'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={sectionCls}>
        <h2 className={h2Cls}>招待リンクを発行</h2>
        <form onSubmit={handleCreateInvite} className="flex items-center gap-2">
          <input
            className="min-h-11 min-w-0 flex-1 rounded-[8px] border-2 border-line px-3 py-2 focus:border-meat focus:outline-none"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="名前（任意・プリフィル用）"
          />
          <button type="submit" className={`btn btn--primary ${btnSm}`} disabled={creating}>
            {creating ? '作成中…' : '作成'}
          </button>
        </form>
        {invites.length > 0 && (
          <ul className={listCls}>
            {invites.map((inv) => {
              const url = inviteUrl(inv)
              return (
                <li key={inv.token} className={rowCls}>
                  <span className="min-w-0">
                    {inv.name ?? '（名前なし）'}
                    <span className={subCls}>{inv.usedBy ? '使用済み' : '未使用'}</span>
                  </span>
                  <button
                    className={`btn ml-auto ${btnSm}`}
                    onClick={() => handleCopy(url, inv.token)}
                    disabled={!!inv.usedBy}
                    title={url}
                  >
                    {copied === inv.token ? 'コピー済み' : 'リンクをコピー'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className={sectionCls}>
        <h2 className={h2Cls}>参加者一覧（{attendees.length}）</h2>
        {attendees.length === 0 ? (
          <p className={emptyCls}>まだいません。</p>
        ) : (
          <ul className={listCls}>
            {attendees.map((a) => (
              <li key={a.id} className={rowCls}>
                <span className="min-w-0">
                  {a.name}
                  {a.job ? `（${a.job}）` : ''}
                  {a.connection ? <span className={subCls}>経由: {a.connection}</span> : ''}
                </span>
                <span className="ml-auto whitespace-nowrap text-[12px] text-ink-soft">{STATUS_LABEL[a.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
