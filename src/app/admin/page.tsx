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
    return <main style={{ padding: 24 }}>読み込み中…</main>
  }

  if (!user) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.8 }}>
        <p>サインインが必要です。</p>
        <Link href="/invite">招待ページへ</Link>
      </main>
    )
  }

  if (!admin) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.8 }}>
        <p>このページは主催者専用です。</p>
      </main>
    )
  }

  const pending = attendees.filter((a) => a.status === 'pending')

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.8, maxWidth: 640 }}>
      <h1>管理</h1>

      <section>
        <h2>確認待ち（{pending.length}）</h2>
        {pending.length === 0 ? (
          <p style={{ color: '#888' }}>確認待ちはありません。</p>
        ) : (
          <ul style={{ display: 'grid', gap: 8, listStyle: 'none', padding: 0 }}>
            {pending.map((p) => (
              <li key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span>
                  {p.name}
                  {p.job ? `（${p.job}）` : ''}
                  <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>
                    No. {p.ticketNo}
                  </span>
                </span>
                <button
                  onClick={() => handleApprove(p.id)}
                  disabled={busy === p.id}
                  style={{ padding: '4px 12px', marginLeft: 'auto' }}
                >
                  {busy === p.id ? '確認中…' : '確認しました！'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>招待リンクを発行</h2>
        <form onSubmit={handleCreateInvite} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="名前（任意・プリフィル用）"
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={creating} style={{ padding: '4px 12px' }}>
            {creating ? '作成中…' : '作成'}
          </button>
        </form>
        {invites.length > 0 && (
          <ul style={{ display: 'grid', gap: 8, listStyle: 'none', padding: 0, marginTop: 12 }}>
            {invites.map((inv) => {
              const url = inviteUrl(inv)
              return (
                <li key={inv.token} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ minWidth: 0 }}>
                    {inv.name ?? '（名前なし）'}
                    <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>
                      {inv.usedBy ? '使用済み' : '未使用'}
                    </span>
                  </span>
                  <button
                    onClick={() => handleCopy(url, inv.token)}
                    disabled={!!inv.usedBy}
                    style={{ padding: '2px 10px', marginLeft: 'auto' }}
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

      <section>
        <h2>参加者一覧（{attendees.length}）</h2>
        {attendees.length === 0 ? (
          <p style={{ color: '#888' }}>まだいません。</p>
        ) : (
          <ul style={{ display: 'grid', gap: 6, listStyle: 'none', padding: 0 }}>
            {attendees.map((a) => (
              <li key={a.id} style={{ display: 'flex', gap: 12 }}>
                <span>
                  {a.name}
                  {a.job ? `（${a.job}）` : ''}
                </span>
                <span style={{ color: '#888', fontSize: 12, marginLeft: 'auto' }}>
                  {STATUS_LABEL[a.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
