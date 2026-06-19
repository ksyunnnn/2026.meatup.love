import Link from 'next/link'

// Custom 404. A flustered meat (🍖 nervously shaking + 💦) so a dead end still
// feels on-brand, plus a clear way back to the top.
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="inline-flex items-center text-[18px] leading-none" aria-hidden="true">
        <span className="meat-panic">🍖</span>
        <span>💦</span>
      </span>
      <p className="text-[12px] font-bold tracking-[0.1em] text-ink-soft">404</p>
      <h1 className="text-[22px] font-extrabold">そんなページは！ない！！</h1>
      <p className="max-w-[320px] text-[14px] text-ink-soft">
        URL間違うてるか、ページ移動したんかも。ごめんて・・。お肉も焦ってることですし・・。
      </p>
      <Link
        className="text-[13px] font-bold text-ink-soft underline-offset-2 hover:underline"
        href="/"
      >
        ← トップへ
      </Link>
    </main>
  )
}
