'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '@/lib/use-auth'
import { Loading } from '@/components/load-state'
import {
  isAdmin,
  listAttendees,
  approveAttendee,
  setPaid,
  setGender,
  cancelAttendee,
  restoreAttendee,
  addAttendeeByAdmin,
  type AttendeeWithId,
} from '@/lib/attendees'
import {
  createInvite,
  listInvites,
  deleteInvite,
  archiveInvite,
  unarchiveInvite,
  type InviteWithToken,
} from '@/lib/invites'
import { JOBS } from '@/lib/profile'
import type { Attendee, AttendeeStatus } from '@/lib/types'

// "What are you looking forward to" — keys map to the register form chips.
const EXP_EMOJI: Record<string, string> = {
  meat: '🍖',
  drink: '🍺',
  play: '🎧',
  connect: '🤝',
}
const EXP_ORDER = ['meat', 'drink', 'play', 'connect']
const EXP_LABEL: Record<string, string> = {
  meat: '肉',
  drink: '酒',
  play: '遊び',
  connect: '繋がり',
}
// Reachable channels — mirrors the register form's CONTACT_METHODS.
const CONTACTS = ['LINE', 'Instagram', 'Twitter', 'Discord']

const wrapCls = 'mx-auto grid max-w-[560px] gap-6 px-4 pb-6 pt-[calc(1.5rem_+_env(safe-area-inset-top))]'
const sectionCls = 'grid gap-3'
const h2Cls = 'text-[18px] font-extrabold'
const listCls = 'grid list-none gap-2'
const rowCls = 'flex items-center gap-3 rounded-[8px] border border-line bg-paper px-4 py-3'
const subCls = 'ml-2 text-[12px] text-ink-soft'
const btnSm = 'min-h-10 whitespace-nowrap px-4 py-2'
const emptyCls = 'text-[14px] text-ink-soft'
// Destructive (HIG: red, never the hero). Quiet outline, not a filled button.
const dangerBtn =
  'min-h-9 whitespace-nowrap rounded-pill border border-meat-dark px-3 py-1 text-[12px] text-meat-dark'
// Even quieter: a rarely-used destructive action that shouldn't compete with
// the everyday controls. Plain text, recedes until hovered.
const quietDanger =
  'whitespace-nowrap text-[11px] text-ink-soft underline-offset-2 hover:text-meat-dark hover:underline disabled:no-underline'

function ms(ts?: Timestamp): number {
  return ts ? ts.toMillis() : 0
}

// "6/22 14:30" — compact, the admin only needs day + time at a glance.
function fmtDate(ts?: Timestamp): string {
  if (!ts) return ''
  const d = ts.toDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mi}`
}

function inviteUrl(inv: InviteWithToken): string {
  const qs = new URLSearchParams()
  if (inv.name) qs.set('name', inv.name)
  if (inv.job) qs.set('job', inv.job)
  qs.set('t', inv.token)
  return `${window.location.origin}/invite?${qs.toString()}`
}

/**
 * One card, used in every section so a guest looks the same wherever they
 * appear. The identity + meta block (name/job/No./referral/expectations/contact/
 * kids/allergy) is IDENTICAL everywhere; only the footer — the timestamp `stamp`
 * and the stage-appropriate `controls` — changes by section (design axis 6:
 * 状態で出し分け). Presentational: the caller computes referral and passes controls.
 */
function AttendeeCard({
  a,
  referral,
  stamp,
  controls,
  dim,
}: {
  a: AttendeeWithId
  referral: string
  stamp: React.ReactNode
  controls?: React.ReactNode
  dim?: boolean
}) {
  return (
    <li
      className={`grid gap-2 rounded-[8px] border border-line bg-paper px-4 py-3 ${
        dim ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 font-bold">
          {a.name}
          {a.job ? (
            <span className="ml-1 font-normal text-ink-soft">
              （{a.job}
              {a.jobOther ? `／${a.jobOther}` : ''}）
            </span>
          ) : null}
        </span>
        <span className="ml-auto whitespace-nowrap text-[12px] tabular-nums text-ink-soft">
          No. {a.ticketNo}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-soft">
        <span>{referral}</span>
        {a.expectations?.length ? (
          <span>{a.expectations.map((k) => EXP_EMOJI[k] ?? '').join('')}</span>
        ) : null}
        {a.contactMethod ? (
          <span>
            {a.contactMethod}: {a.contactValue ?? '—'}
          </span>
        ) : null}
        {a.withKids ? <span>🧒 子連れ</span> : null}
        {a.hasAllergy ? <span>⚠️ {a.allergyNote ?? 'アレルギー'}</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-ink-soft">{stamp}</span>
        {controls ? (
          <span className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {controls}
          </span>
        ) : null}
      </div>
    </li>
  )
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
  const [showCancelled, setShowCancelled] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  // Manual "add a guest" form (host enters everyone who contacted them directly).
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const blankAdd = {
    name: '',
    job: '',
    jobOther: '',
    gender: '',
    expectations: [] as string[],
    contactMethod: '',
    contactValue: '',
    paid: false,
    withKids: false,
    hasAllergy: false,
    allergyNote: '',
  }
  const [add, setAdd] = useState(blankAdd)
  const setAddField = <K extends keyof typeof blankAdd>(k: K, v: (typeof blankAdd)[K]) =>
    setAdd((prev) => ({ ...prev, [k]: v }))

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

  function patch(uid: string, fields: Partial<Attendee>) {
    setAttendees((prev) => prev.map((p) => (p.id === uid ? { ...p, ...fields } : p)))
  }

  async function handleApprove(uid: string) {
    if (!user) return
    setBusy(uid)
    try {
      await approveAttendee(uid, user.uid)
      patch(uid, { status: 'approved', approvedAt: Timestamp.now(), approvedBy: user.uid })
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
      patch(uid, { paid })
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
      patch(uid, { gender: gender || undefined })
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(null)
    }
  }

  async function handleCancel(a: AttendeeWithId) {
    if (!user) return
    const from: AttendeeStatus = a.status === 'cancelled' ? 'pending' : a.status
    if (
      !window.confirm(`${a.name} さんをキャンセルとして記録しますか？（あとで「参加に戻す」で戻せます）`)
    )
      return
    setBusy(a.id)
    try {
      await cancelAttendee(a.id, from)
      patch(a.id, { status: 'cancelled', cancelledAt: Timestamp.now(), cancelledFrom: from })
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(null)
    }
  }

  async function handleRestore(a: AttendeeWithId) {
    if (!user) return
    const to: AttendeeStatus = a.cancelledFrom ?? 'pending'
    setBusy(a.id)
    try {
      await restoreAttendee(a.id, to)
      patch(a.id, { status: to, cancelledAt: undefined, cancelledFrom: undefined })
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(null)
    }
  }

  async function handleAddAttendee(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const name = add.name.trim()
    if (!name) return
    setAdding(true)
    try {
      const created = await addAttendeeByAdmin(user.uid, {
        name,
        job: add.job || undefined,
        jobOther: add.job === 'その他' ? add.jobOther.trim() || undefined : undefined,
        gender: add.gender || undefined,
        expectations: add.expectations.length ? add.expectations : undefined,
        contactMethod: add.contactMethod || undefined,
        contactValue: add.contactValue.trim() || undefined,
        paid: add.paid || undefined,
        withKids: add.withKids || undefined,
        hasAllergy: add.hasAllergy || undefined,
        allergyNote: add.hasAllergy ? add.allergyNote.trim() || undefined : undefined,
      })
      setAttendees((prev) => [created, ...prev])
      setAdd(blankAdd)
      setShowAdd(false)
    } catch (err) {
      console.error(err)
    } finally {
      setAdding(false)
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

  // Unused invite: deletion IS the revoke (validInvite() checks exists()).
  async function handleDeleteInvite(inv: InviteWithToken) {
    if (!window.confirm(`未使用の招待リンク「${inv.name ?? '名前なし'}」を取り消しますか？（リンクは使えなくなります）`))
      return
    setBusy(inv.token)
    try {
      await deleteInvite(inv.token)
      setInvites((prev) => prev.filter((i) => i.token !== inv.token))
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(null)
    }
  }

  // Used invite: archive (keep the doc so referral attribution survives).
  async function handleArchiveInvite(token: string, archive: boolean) {
    setBusy(token)
    try {
      if (archive) await archiveInvite(token)
      else await unarchiveInvite(token)
      setInvites((prev) =>
        prev.map((i) =>
          i.token === token ? { ...i, archivedAt: archive ? Timestamp.now() : undefined } : i,
        ),
      )
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(null)
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

  // Cancelled guests leave the active roster and every tally.
  const cancelled = attendees
    .filter((a) => a.status === 'cancelled')
    .sort((x, y) => ms(y.cancelledAt) - ms(x.cancelledAt))
  const activeAll = attendees.filter((a) => a.status !== 'cancelled')

  // Both lists ordered by registration time, newest first (most recent
  // sign-ups surface at the top).
  const byCreated = (x: AttendeeWithId, y: AttendeeWithId) => ms(y.createdAt) - ms(x.createdAt)
  const pending = activeAll.filter((a) => a.status === 'pending').sort(byCreated)
  const roster = [...activeAll].sort(byCreated)

  const paidCount = activeAll.filter((a) => a.paid).length
  const expCounts = EXP_ORDER.map((k) => ({
    emoji: EXP_EMOJI[k],
    n: activeAll.filter((a) => a.expectations?.includes(k)).length,
  }))
  // Gender isn't asked at registration — the host sets it here. Track assignment
  // progress (and feed the public Data aggregation later).
  const genderCounts = ['男', '女', 'その他'].map((g) => ({
    g,
    n: activeAll.filter((a) => a.gender === g).length,
  }))
  const genderUnset = activeAll.filter((a) => !a.gender).length

  const activeInvites = invites.filter((i) => !i.archivedAt)
  const archivedInvites = invites.filter((i) => i.archivedAt)

  // Referral source, derived from the invite link they used (no manual input):
  // host-issued → "運営の招待", attendee-issued → "◯◯ さんの招待", none → "飛び込み".
  const inviteByToken = new Map(invites.map((i) => [i.token, i]))
  const nameByUid = new Map(attendees.map((a) => [a.id, a.name]))
  function referral(a: AttendeeWithId): string {
    if (a.addedByAdmin) return '運営が追加'
    if (!a.inviteToken) return '飛び込み'
    const inv = inviteByToken.get(a.inviteToken)
    if (!inv) return '招待リンク'
    const issuerName = nameByUid.get(inv.issuedBy)
    return issuerName ? `${issuerName} さんの招待` : '運営の招待'
  }

  const genderSelect = (a: AttendeeWithId) => (
    <label className="flex items-center gap-1 text-[12px] text-ink-soft">
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
  )

  return (
    <main className={wrapCls}>
      <Link
        href="/"
        className="justify-self-start text-[13px] text-ink-soft underline-offset-2 hover:text-meat hover:underline"
      >
        ← トップへ
      </Link>
      <h1 className="text-[26px] font-extrabold">管理 🍖</h1>

      <section className={sectionCls}>
        <h2 className={h2Cls}>確認待ち（{pending.length}）</h2>
        {pending.length === 0 ? (
          <p className={emptyCls}>確認待ちはありません。</p>
        ) : (
          <ul className={listCls}>
            {pending.map((p) => (
              <AttendeeCard
                key={p.id}
                a={p}
                referral={referral(p)}
                stamp={`登録 ${fmtDate(p.createdAt)}`}
                controls={
                  <button
                    className={`btn btn--primary ${btnSm}`}
                    onClick={() => handleApprove(p.id)}
                    disabled={busy === p.id}
                  >
                    {busy === p.id ? '確認中…' : '確認しました！'}
                  </button>
                }
              />
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
        {activeInvites.length > 0 && (
          <ul className={listCls}>
            {activeInvites.map((inv) => {
              const url = inviteUrl(inv)
              const used = !!inv.usedBy
              return (
                <li key={inv.token} className={rowCls}>
                  <span className="min-w-0">
                    {inv.name ?? '（名前なし）'}
                    {inv.job ? <span className={subCls}>{inv.job}</span> : null}
                    <span className={subCls}>{used ? '使用済み' : '未使用'}</span>
                  </span>
                  {used ? (
                    // Consumed link: archive to declutter (the doc is kept so the
                    // attendee's referral attribution still resolves).
                    <button
                      className={`btn ml-auto ${btnSm}`}
                      onClick={() => handleArchiveInvite(inv.token, true)}
                      disabled={busy === inv.token}
                    >
                      アーカイブ
                    </button>
                  ) : (
                    <span className="ml-auto flex items-center gap-2">
                      <button
                        className={`btn ${btnSm}`}
                        onClick={() => handleCopy(url, inv.token)}
                        title={url}
                      >
                        {copied === inv.token ? 'コピー済み' : 'リンクをコピー'}
                      </button>
                      <button
                        className={dangerBtn}
                        onClick={() => handleDeleteInvite(inv)}
                        disabled={busy === inv.token}
                      >
                        取り消す
                      </button>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {archivedInvites.length > 0 && (
          <div className="grid gap-2">
            <button
              className="justify-self-start text-[13px] text-ink-soft underline-offset-2 hover:text-meat hover:underline"
              onClick={() => setShowArchived((v) => !v)}
            >
              アーカイブ済み（{archivedInvites.length}）{showArchived ? '▲' : '▼'}
            </button>
            {showArchived && (
              <ul className={listCls}>
                {archivedInvites.map((inv) => (
                  <li key={inv.token} className={`${rowCls} opacity-60`}>
                    <span className="min-w-0">
                      {inv.name ?? '（名前なし）'}
                      {inv.job ? <span className={subCls}>{inv.job}</span> : null}
                      <span className={subCls}>使用済み</span>
                    </span>
                    <button
                      className={`btn ml-auto ${btnSm}`}
                      onClick={() => handleArchiveInvite(inv.token, false)}
                      disabled={busy === inv.token}
                    >
                      戻す
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className={sectionCls}>
        <button
          className="flex items-center gap-2 justify-self-start text-[18px] font-extrabold"
          onClick={() => setShowAdd((v) => !v)}
        >
          参加者を追加 {showAdd ? '▲' : '▼'}
        </button>
        {showAdd && (
          <form onSubmit={handleAddAttendee} className="grid gap-3 rounded-[8px] border border-line bg-paper p-4">
            <p className="text-[12px] text-ink-soft">
              直接連絡をくれた人を運営が登録します。アカウントは作られず、確定として一覧に入ります。
            </p>
            <input
              className="min-h-11 rounded-[8px] border-2 border-line px-3 py-2 focus:border-meat focus:outline-none"
              value={add.name}
              onChange={(e) => setAddField('name', e.target.value)}
              placeholder="名前（必須）"
              maxLength={16}
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="min-h-11 flex-1 rounded-[8px] border-2 border-line bg-white px-2 py-2 text-[14px] focus:border-meat focus:outline-none"
                value={add.job}
                onChange={(e) => setAddField('job', e.target.value)}
              >
                <option value="">職業（任意）</option>
                {JOBS.map((j) => (
                  <option key={j.value} value={j.value}>
                    {j.emoji} {j.value}
                  </option>
                ))}
              </select>
              <select
                className="min-h-11 rounded-[8px] border-2 border-line bg-white px-2 py-2 text-[14px] focus:border-meat focus:outline-none"
                value={add.gender}
                onChange={(e) => setAddField('gender', e.target.value)}
              >
                <option value="">性別（任意）</option>
                <option value="男">男</option>
                <option value="女">女</option>
                <option value="その他">その他</option>
              </select>
            </div>
            {add.job === 'その他' && (
              <input
                className="min-h-11 rounded-[8px] border-2 border-line px-3 py-2 focus:border-meat focus:outline-none"
                value={add.jobOther}
                onChange={(e) => setAddField('jobOther', e.target.value)}
                placeholder="職業（その他・自由入力）"
                maxLength={16}
              />
            )}
            <div className="grid gap-1">
              <span className="text-[12px] text-ink-soft">楽しみ（任意）</span>
              <div className="flex flex-wrap gap-2">
                {EXP_ORDER.map((k) => {
                  const on = add.expectations.includes(k)
                  return (
                    <button
                      type="button"
                      key={k}
                      onClick={() =>
                        setAddField(
                          'expectations',
                          on
                            ? add.expectations.filter((x) => x !== k)
                            : [...add.expectations, k],
                        )
                      }
                      className={`min-h-10 rounded-pill border-2 px-3 text-[13px] font-semibold ${
                        on ? 'border-meat bg-cream text-meat' : 'border-line text-ink-soft'
                      }`}
                    >
                      {EXP_EMOJI[k]} {EXP_LABEL[k]}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="min-h-11 rounded-[8px] border-2 border-line bg-white px-2 py-2 text-[14px] focus:border-meat focus:outline-none"
                value={add.contactMethod}
                onChange={(e) => setAddField('contactMethod', e.target.value)}
              >
                <option value="">連絡手段（任意）</option>
                {CONTACTS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                className="min-h-11 min-w-0 flex-1 rounded-[8px] border-2 border-line px-3 py-2 focus:border-meat focus:outline-none"
                value={add.contactValue}
                onChange={(e) => setAddField('contactValue', e.target.value)}
                placeholder="ID / ユーザー名"
                maxLength={50}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-soft">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-meat"
                  checked={add.paid}
                  onChange={(e) => setAddField('paid', e.target.checked)}
                />
                支払い済み
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-meat"
                  checked={add.withKids}
                  onChange={(e) => setAddField('withKids', e.target.checked)}
                />
                🧒 子連れ
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-meat"
                  checked={add.hasAllergy}
                  onChange={(e) => setAddField('hasAllergy', e.target.checked)}
                />
                ⚠️ アレルギー
              </label>
            </div>
            {add.hasAllergy && (
              <input
                className="min-h-11 rounded-[8px] border-2 border-line px-3 py-2 focus:border-meat focus:outline-none"
                value={add.allergyNote}
                onChange={(e) => setAddField('allergyNote', e.target.value)}
                placeholder="アレルギーの内容（任意）"
                maxLength={100}
              />
            )}
            <button
              type="submit"
              className={`btn btn--primary ${btnSm} justify-self-start`}
              disabled={adding || !add.name.trim()}
            >
              {adding ? '追加中…' : '確定として追加'}
            </button>
          </form>
        )}
      </section>

      <section className={sectionCls}>
        <h2 className={h2Cls}>
          参加者一覧（{activeAll.length}・支払い済み {paidCount}）
        </h2>
        {activeAll.length > 0 && (
          <p className="text-[12px] text-ink-soft">
            楽しみ：{expCounts.map((c) => `${c.emoji}${c.n}`).join('　')}
          </p>
        )}
        {activeAll.length > 0 && (
          <p className="text-[12px] text-ink-soft">
            性別：{genderCounts.map((c) => `${c.g}${c.n}`).join('　')}　未設定
            {genderUnset}
          </p>
        )}
        {roster.length === 0 ? (
          <p className={emptyCls}>まだいません。</p>
        ) : (
          <ul className={listCls}>
            {roster.map((a) => (
              <AttendeeCard
                key={a.id}
                a={a}
                referral={referral(a)}
                stamp={
                  a.status === 'approved' ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-meat">●</span>確定 {fmtDate(a.approvedAt)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-ink-soft">
                      <span>○</span>未確定
                    </span>
                  )
                }
                controls={
                  <>
                    {genderSelect(a)}
                    <label className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-meat"
                        checked={!!a.paid}
                        onChange={(e) => handleTogglePaid(a.id, e.target.checked)}
                        disabled={busy === a.id}
                      />
                      支払い済み
                    </label>
                    <button
                      className={quietDanger}
                      onClick={() => handleCancel(a)}
                      disabled={busy === a.id}
                    >
                      キャンセル受付
                    </button>
                  </>
                }
              />
            ))}
          </ul>
        )}
      </section>

      {cancelled.length > 0 && (
        <section className={sectionCls}>
          <button
            className="flex items-center gap-2 justify-self-start text-[15px] font-bold text-ink-soft"
            onClick={() => setShowCancelled((v) => !v)}
          >
            キャンセル（{cancelled.length}）{showCancelled ? '▲' : '▼'}
          </button>
          {showCancelled && (
            <ul className={listCls}>
              {cancelled.map((a) => (
                <AttendeeCard
                  key={a.id}
                  a={a}
                  dim
                  referral={referral(a)}
                  stamp={`キャンセル ${fmtDate(a.cancelledAt)}`}
                  controls={
                    <button
                      className={`btn ${btnSm}`}
                      onClick={() => handleRestore(a)}
                      disabled={busy === a.id}
                    >
                      参加に戻す
                    </button>
                  }
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}
