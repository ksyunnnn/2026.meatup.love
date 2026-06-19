'use client'
// Focused edit screen for the guest's own contact, reached from the /mypage
// header pen and the register completion "やっぱりSNS" link. A dedicated screen
// keeps the edit calm and single-task, away from the dense /mypage. Save returns
// to /mypage (whose header reflects the new value on reload).
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMyAttendee } from '@/lib/use-my-attendee'
import { ContactEditor } from '@/components/contact-editor'
import { ContactSection } from '@/components/member-info'
import { Loading, RetryNotice } from '@/components/load-state'

const wrapCls =
  'flex min-h-dvh flex-col items-center gap-4 px-4 pt-[calc(2rem_+_env(safe-area-inset-top))] pb-[calc(2rem_+_env(safe-area-inset-bottom))]'

export default function ContactEditPage() {
  const { user, loading, attendee, loaded, error } = useMyAttendee()
  const router = useRouter()

  if (error && !loaded) {
    return <RetryNotice className={wrapCls + ' justify-center'} />
  }
  if (loading || (user && !loaded)) {
    return <Loading className={wrapCls + ' justify-center'} />
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

  return (
    <main className={wrapCls}>
      <ContactEditor
        uid={user.uid}
        initialMethod={attendee.contactMethod ?? ''}
        initialValue={attendee.contactValue ?? ''}
        onSaved={() => router.push('/mypage')}
      />
      <ContactSection />
      <Link
        className="text-[13px] font-bold text-ink-soft underline-offset-2 hover:underline"
        href="/mypage"
      >
        ← マイページへ戻る
      </Link>
    </main>
  )
}
