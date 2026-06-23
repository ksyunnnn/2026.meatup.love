'use client'
// Admin-only edit screen for a single guest, reached from the /admin roster's
// 編集 link (?id=<attendee id>). A dedicated screen keeps the dense roster calm
// — editing happens here, not inline. Save writes the profile fields and returns
// to /admin. Mirrors the /mypage/contact pattern (focused, single-task screen).
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/use-auth'
import { Loading } from '@/components/load-state'
import { isAdmin, getAttendee, updateAttendeeProfile, deleteAttendee } from '@/lib/attendees'
import {
  AttendeeFields,
  attendeeToForm,
  blankAttendeeForm,
  type AttendeeFormValues,
} from '@/components/attendee-fields'
import type { Attendee } from '@/lib/types'

const wrapCls =
  'mx-auto grid max-w-[560px] gap-5 px-4 pb-10 pt-[calc(1.5rem_+_env(safe-area-inset-top))]'

function EditInner() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const id = useSearchParams().get('id') ?? ''

  const [checked, setChecked] = useState(false)
  const [admin, setAdmin] = useState(false)
  const [attendee, setAttendee] = useState<Attendee | null>(null)
  const [form, setForm] = useState<AttendeeFormValues>(blankAttendeeForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    let active = true
    isAdmin(user.uid)
      .then(async (ok) => {
        if (!active) return
        setAdmin(ok)
        if (ok && id) {
          const a = await getAttendee(id)
          if (!active) return
          setAttendee(a)
          if (a) setForm(attendeeToForm(a))
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
  }, [loading, user, id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!attendee) return
    const name = form.name.trim()
    if (!name) return
    setSaving(true)
    try {
      await updateAttendeeProfile(
        id,
        {
          name,
          job: form.job || undefined,
          jobOther: form.job === 'その他' ? form.jobOther.trim() || undefined : undefined,
          gender: form.gender || undefined,
          expectations: form.expectations.length ? form.expectations : undefined,
          contactMethod: form.contactMethod || undefined,
          contactValue: form.contactValue.trim() || undefined,
          paid: form.paid || undefined,
          withKids: form.withKids || undefined,
          hasAllergy: form.hasAllergy || undefined,
          allergyNote: form.hasAllergy ? form.allergyNote.trim() || undefined : undefined,
        },
        // Only stamp paidAt when payment was just turned on (don't overwrite the
        // original time on an unrelated re-save).
        { touchPaidAt: form.paid && !attendee.paid },
      )
      router.push('/admin')
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!attendee) return
    // Permanent — unlike キャンセル受付 (reversible). Confirm names the guest.
    if (
      !window.confirm(
        `${attendee.name} さんを完全に削除します（取り消せません）。よろしいですか？\n\n※ 出欠を一時的に外すだけなら、一覧の「キャンセル受付」を使ってください。`,
      )
    )
      return
    setDeleting(true)
    try {
      await deleteAttendee(id)
      router.push('/admin')
    } catch (err) {
      console.error(err)
      setDeleting(false)
    }
  }

  if (loading || (user && !checked)) {
    return <Loading className={wrapCls} />
  }
  if (!user) {
    return (
      <main className={wrapCls}>
        <p>サインインが必要です。</p>
        <Link className="btn btn--primary justify-self-start" href="/invite">
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
  if (!attendee) {
    return (
      <main className={wrapCls}>
        <p>参加者が見つかりませんでした。</p>
        <Link
          className="text-[13px] font-bold text-ink-soft underline-offset-2 hover:text-meat hover:underline"
          href="/admin"
        >
          ← 一覧へ戻る
        </Link>
      </main>
    )
  }

  return (
    <main className={wrapCls}>
      <Link
        href="/admin"
        className="justify-self-start text-[13px] text-ink-soft underline-offset-2 hover:text-meat hover:underline"
      >
        ← 一覧へ戻る
      </Link>
      <div className="grid gap-1">
        <h1 className="text-[22px] font-extrabold">参加者を編集</h1>
        <p className="text-[12px] text-ink-soft">
          {attendee.name}（No. {attendee.ticketNo}）
        </p>
      </div>

      <form onSubmit={handleSave} className="grid gap-3 rounded-[8px] border border-line bg-paper p-4">
        <AttendeeFields values={form} onChange={setForm} />
        <button
          type="submit"
          className="btn btn--primary min-h-10 justify-self-start px-4 py-2"
          disabled={saving || !form.name.trim()}
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </form>

      {!attendee.addedByAdmin && (
        <p className="text-[11px] text-ink-soft">
          ※ 名前・職業・楽しみの変更は公開チケット(OG)には反映されません（本人のみ更新可）。
        </p>
      )}

      {/* Destructive, kept apart from the form and quiet (HIG: red + confirm, not
          the hero). For a reversible "外すだけ" use キャンセル受付 on the roster. */}
      <div className="mt-4 grid gap-1 border-t border-line pt-4">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || saving}
          className="justify-self-start text-[12px] text-meat-dark underline-offset-2 hover:underline disabled:opacity-50"
        >
          {deleting ? '削除中…' : 'この参加者を削除'}
        </button>
        <p className="text-[11px] text-ink-soft">
          完全に削除します（取り消せません）。一時的に外すだけなら一覧の「キャンセル受付」を。
        </p>
      </div>
    </main>
  )
}

export default function AdminEditPage() {
  return (
    <Suspense fallback={<Loading className={wrapCls} />}>
      <EditInner />
    </Suspense>
  )
}
