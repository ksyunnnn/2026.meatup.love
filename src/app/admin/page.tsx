'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/use-auth'
import {
  isAdmin,
  listPendingAttendees,
  approveAttendee,
  type AttendeeWithId,
} from '@/lib/attendees'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const [admin, setAdmin] = useState(false)
  const [checked, setChecked] = useState(false)
  const [pending, setPending] = useState<AttendeeWithId[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user) return
    let active = true
    isAdmin(user.uid)
      .then(async (ok) => {
        if (!active) return
        setAdmin(ok)
        if (ok) {
          const list = await listPendingAttendees()
          if (!active) return
          setPending(list)
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
      setPending((prev) => prev.filter((p) => p.id !== uid))
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(null)
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

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.8 }}>
      <h1>管理：確認待ち</h1>
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
    </main>
  )
}
