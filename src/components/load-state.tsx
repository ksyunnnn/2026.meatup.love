'use client'
// Shown when auth restore or the first Firestore read stalls/fails, instead of
// spinning forever. On iOS Safari, Firebase Auth's IndexedDB session restore or
// the Firestore WebChannel connection can hang on first load (reload "fixes" it);
// a full reload re-establishes a fresh connection, the most reliable recovery.
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
