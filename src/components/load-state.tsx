'use client'
// Shown when auth restore or the first Firestore read stalls/fails, instead of
// spinning forever. On iOS Safari, Firebase Auth's IndexedDB session restore or
// the Firestore WebChannel connection can hang on first load (reload "fixes" it);
// a full reload re-establishes a fresh connection, the most reliable recovery.
// Loading screen: a meat that frantically runs left (in place) with a puff of
// 💨 behind it — our spinner. Pure CSS (.meat-run / .meat-puff in globals.css),
// reduced-motion safe.
export function Loading({
  className,
  label = '読み込み中…',
}: {
  className?: string
  label?: string
}) {
  return (
    <main className={className}>
      <MeatRunner label={label} />
    </main>
  )
}

// Just the animated meat (no layout wrapper). Reuse inline for small in-card
// loading states; <Loading> wraps it for a full-screen loader.
export function MeatRunner({
  className,
  label = '読み込み中…',
}: {
  className?: string
  label?: string
}) {
  return (
    <span
      className={'inline-flex items-center text-[18px] leading-none ' + (className ?? '')}
      role="status"
      aria-label={label}
    >
      <span className="meat-run" aria-hidden="true">
        🍖
      </span>
      <span className="meat-puff" aria-hidden="true">
        💨
      </span>
    </span>
  )
}

export function RetryNotice({ className }: { className?: string }) {
  return (
    <main className={className}>
      <p className="text-center text-[15px]">読み込みに時間がかかっています。</p>
      <button
        className="btn btn--primary"
        onClick={() => window.location.reload()}
      >
        再試行
      </button>
      <p className="text-center text-[12px] text-ink-soft">
        繰り返す場合は通信環境を変えてお試しください。
      </p>
    </main>
  )
}
