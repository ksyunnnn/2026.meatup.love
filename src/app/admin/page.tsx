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
import styles from './admin.module.css'

const STATUS_LABEL: Record<AttendeeStatus, string> = {
  pending: '受付（確認待ち）',
  approved: '確定 ✅',
  rejected: '却下',
}

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

  if (!admin) {
    return (
      <main className={styles.wrap}>
        <p>このページは主催者専用です。</p>
      </main>
    )
  }

  const pending = attendees.filter((a) => a.status === 'pending')

  return (
    <main className={styles.wrap}>
      <h1 className={styles.h1}>管理 🍖</h1>

      <section className={styles.section}>
        <h2 className={styles.h2}>確認待ち（{pending.length}）</h2>
        {pending.length === 0 ? (
          <p className={styles.empty}>確認待ちはありません。</p>
        ) : (
          <ul className={styles.list}>
            {pending.map((p) => (
              <li key={p.id} className={styles.row}>
                <span className={styles.rowMain}>
                  {p.name}
                  {p.job ? `（${p.job}）` : ''}
                  <span className={styles.sub}>No. {p.ticketNo}</span>
                </span>
                <button
                  className={`btn btn--primary ${styles.btnSm} ${styles.spacer}`}
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

      <section className={styles.section}>
        <h2 className={styles.h2}>招待リンクを発行</h2>
        <form onSubmit={handleCreateInvite} className={styles.inviteForm}>
          <input
            className={styles.input}
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="名前（任意・プリフィル用）"
          />
          <button type="submit" className={`btn btn--primary ${styles.btnSm}`} disabled={creating}>
            {creating ? '作成中…' : '作成'}
          </button>
        </form>
        {invites.length > 0 && (
          <ul className={styles.list}>
            {invites.map((inv) => {
              const url = inviteUrl(inv)
              return (
                <li key={inv.token} className={styles.row}>
                  <span className={styles.rowMain}>
                    {inv.name ?? '（名前なし）'}
                    <span className={styles.sub}>{inv.usedBy ? '使用済み' : '未使用'}</span>
                  </span>
                  <button
                    className={`btn ${styles.btnSm} ${styles.spacer}`}
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

      <section className={styles.section}>
        <h2 className={styles.h2}>参加者一覧（{attendees.length}）</h2>
        {attendees.length === 0 ? (
          <p className={styles.empty}>まだいません。</p>
        ) : (
          <ul className={styles.list}>
            {attendees.map((a) => (
              <li key={a.id} className={styles.row}>
                <span className={styles.rowMain}>
                  {a.name}
                  {a.job ? `（${a.job}）` : ''}
                </span>
                <span className={styles.status}>{STATUS_LABEL[a.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
