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

      <p className="mt-2 text-[20px] font-bold">お肉、食べようぜ！🍖</p>

      <div className="grid gap-1.5 text-[15px]">
        <p>📅 2026.07.25（土）</p>
        <p>
          ⏰ 11:00 open 〜 19:00 close{" "}
          <span className="text-[12px] text-ink-soft">（時間は仮）</span>
        </p>
        <p>
          📍{" "}
          <a
            href="https://goo.gl/maps/NX273kTyHT5NrSvF8"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            EAT TOKYO JAKUZURE
          </a>
        </p>
      </div>

      <a
        href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=meatup+2026&dates=20260725T110000/20260725T190000&ctz=Asia/Tokyo&location=EAT+TOKYO+JAKUZURE+%E6%9D%B1%E4%BA%AC%E9%83%BD%E7%9B%AE%E9%BB%92%E5%8C%BA%E4%B8%8A%E7%9B%AE%E9%BB%925-30-12&details=%E3%81%8A%E8%82%89%E3%80%81%E9%A3%9F%E3%81%B9%E3%82%88%E3%81%86%EF%BC%81%F0%9F%8D%96"
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn--block max-w-[320px]"
      >
        📅 カレンダーに追加
      </a>

      <div className="mt-4 flex w-full max-w-[320px] flex-col gap-3">
        <Link className="btn btn--primary btn--block" href="/invite">
          招待された方はこちら →
        </Link>
        <Link className="btn btn--block" href="/ticket">
          チケットを見る
        </Link>
      </div>

      {/* Past editions. URLs are the current Pages deploys; they become
          2018.meatup.love / 2019-summer.meatup.love once the apex is connected. */}
      <div className="mt-8 grid gap-1.5 text-[12px] text-ink-soft">
        <p>
          歴代 meatup：
          <a
            href="https://meatup-2018.pages.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-meat underline-offset-2 hover:underline"
          >
            2018
          </a>
          {" / "}
          <a
            href="https://meatup-2019-summer.pages.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-meat underline-offset-2 hover:underline"
          >
            2019 summer
          </a>
        </p>
        <p>
          過去の開催の様子 →{" "}
          <a
            href="https://twitter.com/hashtag/meatup2019"
            target="_blank"
            rel="noopener noreferrer"
            className="text-meat underline-offset-2 hover:underline"
          >
            #meatup2019
          </a>
        </p>
      </div>

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
