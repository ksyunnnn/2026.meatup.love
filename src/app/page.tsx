import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 pt-[calc(3rem_+_env(safe-area-inset-top))] pb-[calc(3rem_+_env(safe-area-inset-bottom))] text-center">
      <div className="text-[72px] leading-none drop-shadow-[0_6px_10px_rgba(126,0,29,0.25)]">
        🍖
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-[clamp(56px,22vw,104px)] leading-[0.9] tracking-[0.02em] text-ink">
        meat<span className="text-meat">up</span>
      </h1>
      <span className="inline-block -rotate-2 rounded-pill bg-meat px-6 py-0.5 font-[family-name:var(--font-display)] text-[clamp(28px,9vw,44px)] text-white shadow-card">
        2026
      </span>

      <p className="mt-2 text-[18px] font-bold">お肉でつながる、あの会。</p>
      <p className="text-[14px] text-ink-soft">日時・場所は調整中。続報を待て🔥</p>

      <div className="mt-4 flex w-full max-w-[320px] flex-col gap-3">
        <Link className="btn btn--primary btn--block" href="/invite">
          招待された方はこちら →
        </Link>
        <Link className="btn btn--block" href="/ticket">
          チケットを見る
        </Link>
      </div>

      <p className="mt-8 text-[12px] text-ink-soft">
        歴代 meatup：2018 / 2019 summer …
      </p>

      {/* Discreet host entry — the page is access-gated (UI + Firestore rules). */}
      <Link
        href="/admin"
        className="mt-1 text-[11px] text-ink-soft/50 transition-colors hover:text-ink-soft"
      >
        主催者ページ
      </Link>
    </main>
  );
}
