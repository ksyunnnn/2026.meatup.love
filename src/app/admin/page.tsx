'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/use-auth'
import { Loading } from '@/components/load-state'
import {
  isAdmin,
  listAttendees,
  approveAttendee,
  setPaid,
  setGender,
  type AttendeeWithId,
} from '@/lib/attendees'
import { createInvite, listInvites, type InviteWithToken } from '@/lib/invites'
import { JOBS } from '@/lib/profile'
import type { AttendeeStatus } from '@/lib/types'

const STATUS_LABEL: Record<AttendeeStatus, string> = {
  pending: '受付（確認待ち）',
  approved: '確定 ✅',
  rejected: '却下',
}

// "What are you looking forward to" — keys map to the register form chips.
const EXP_EMOJI: Record<string, string> = {
  meat: '🍖',
  drink: '🍺',
  play: '🎧',
  connect: '🤝',
}
const EXP_ORDER = ['meat', 'drink', 'play', 'connect']

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
  if (inv.job) qs.set('job', inv.job)
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
  const [inviteJob, setInviteJob] = useState('')
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

  async function handleTogglePaid(uid: string, paid: boolean) {
    if (!user) return
    setBusy(uid)
    try {
      await setPaid(uid, paid)
      setAttendees((prev) => prev.map((p) => (p.id === uid ? { ...p, paid } : p)))
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(null)
    }
  }

  async function handleSetGender(uid: string, gender: string) {
    if (!user) return
    setBusy(uid)
    try {
      await setGender(uid, gender)
      setAttendees((prev) =>
        prev.map((p) => (p.id === uid ? { ...p, gender: gender || undefined } : p)),
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
      await createInvite(user.uid, inviteName.trim() || undefined, inviteJob || undefined)
      setInviteName('')
      setInviteJob('')
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

  if (!admin) {
    return (
      <main className={wrapCls}>
        <p>このページは運営専用です。</p>
      </main>
    )
  }

  const pending = attendees.filter((a) => a.status === 'pending')
  const paidCount = attendees.filter((a) => a.paid).length
  const expCounts = EXP_ORDER.map((k) => ({
    emoji: EXP_EMOJI[k],
    n: attendees.filter((a) => a.expectations?.includes(k)).length,
  }))
  // Gender isn't asked at registration — the host sets it here. Track assignment
  // progress (and feed the public Data aggregation later).
  const genderCounts = ['男', '女', 'その他'].map((g) => ({
    g,
    n: attendees.filter((a) => a.gender === g).length,
  }))
  const genderUnset = attendees.filter((a) => !a.gender).length

  // Referral source, derived from the invite link they used (no manual input):
  // host-issued → "運営の招待", attendee-issued → "◯◯ さんの招待", none → "飛び込み".
  const inviteByToken = new Map(invites.map((i) => [i.token, i]))
  const nameByUid = new Map(attendees.map((a) => [a.id, a.name]))
  function referral(a: AttendeeWithId): string {
    if (!a.inviteToken) return '飛び込み'
    const inv = inviteByToken.get(a.inviteToken)
    if (!inv) return '招待リンク'
    const issuerName = nameByUid.get(inv.issuedBy)
    return issuerName ? `${issuerName} さんの招待` : '運営の招待'
  }

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
                  <span className={subCls}>{referral(p)}</span>
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
        <form onSubmit={handleCreateInvite} className="flex flex-wrap items-center gap-2">
          <input
            className="min-h-11 min-w-0 flex-1 rounded-[8px] border-2 border-line px-3 py-2 focus:border-meat focus:outline-none"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="名前（任意・プリフィル用）"
          />
          <select
            className="min-h-11 rounded-[8px] border-2 border-line bg-white px-2 py-2 text-[14px] focus:border-meat focus:outline-none"
            value={inviteJob}
            onChange={(e) => setInviteJob(e.target.value)}
          >
            <option value="">職業（任意）</option>
            {JOBS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.emoji} {j.value}
              </option>
            ))}
          </select>
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
                    {inv.job ? <span className={subCls}>{inv.job}</span> : null}
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
        <h2 className={h2Cls}>
          参加者一覧（{attendees.length}・支払い済み {paidCount}）
        </h2>
        {attendees.length > 0 && (
          <p className="text-[12px] text-ink-soft">
            楽しみ：{expCounts.map((c) => `${c.emoji}${c.n}`).join('　')}
          </p>
        )}
        {attendees.length > 0 && (
          <p className="text-[12px] text-ink-soft">
            性別：{genderCounts.map((c) => `${c.g}${c.n}`).join('　')}　未設定
            {genderUnset}
          </p>
        )}
        {attendees.length === 0 ? (
          <p className={emptyCls}>まだいません。</p>
        ) : (
          <ul className={listCls}>
            {attendees.map((a) => (
              <li
                key={a.id}
                className="grid gap-2 rounded-[8px] border border-line bg-paper px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    {a.name}
                    {a.job ? `（${a.job}${a.jobOther ? `／${a.jobOther}` : ''}）` : ''}
                    {a.expectations?.length ? (
                      <span className={subCls}>
                        {a.expectations.map((k) => EXP_EMOJI[k] ?? '').join('')}
                      </span>
                    ) : null}
                    <span className={subCls}>{referral(a)}</span>
                  </span>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-[12px] text-ink-soft">{STATUS_LABEL[a.status]}</span>
                    <button
                      className={`${btnSm} rounded-pill border-2 text-[12px] ${
                        a.paid
                          ? 'border-meat bg-meat text-white'
                          : 'border-line text-ink-soft'
                      }`}
                      onClick={() => handleTogglePaid(a.id, !a.paid)}
                      disabled={busy === a.id}
                    >
                      {a.paid ? '✓ 払った' : '未払い'}
                    </button>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-soft">
                  {a.contactMethod ? (
                    <span>
                      {a.contactMethod}: {a.contactValue ?? '—'}
                    </span>
                  ) : null}
                  {a.withKids ? <span>🧒 子連れ</span> : null}
                  {a.hasAllergy ? <span>⚠️ {a.allergyNote ?? 'アレルギー'}</span> : null}
                  <label className="ml-auto flex items-center gap-1">
                    性別
                    <select
                      className="rounded-[6px] border border-line bg-white px-1.5 py-1 text-[12px]"
                      value={a.gender ?? ''}
                      onChange={(e) => handleSetGender(a.id, e.target.value)}
                      disabled={busy === a.id}
                    >
                      <option value="">未設定</option>
                      <option value="男">男</option>
                      <option value="女">女</option>
                      <option value="その他">その他</option>
                    </select>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
