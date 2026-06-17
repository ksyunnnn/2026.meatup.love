import Link from "next/link";
import { BounceOniku } from "@/components/bounce-oniku";
import { TweetChip } from "@/components/tweet-chip";
import { CONTACTS } from "@/lib/contacts";
import { InstagramIcon, TwitterIcon } from "@/components/icons";

// Google Calendar "add event" link, built at render (static) time so the
// multibyte title/body are encoded safely. Body keeps 2019's casual tone.
const CAL_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  "&text=" +
  encodeURIComponent("🍖MEATUP2026夏") +
  "&dates=20260725T110000/20260725T190000&ctz=Asia/Tokyo" +
  "&location=" +
  encodeURIComponent("EAT TOKYO JAKUZURE 東京都目黒区上目黒5-30-12") +
  "&details=" +
  encodeURIComponent(
    [
      "お肉、食べようぜ！🍖",
      "ゆる〜くお肉を囲む meatup、2026 夏に帰ってきます。",
      "",
      "📅 2026.07.25（土）⏰ 11:00 〜 19:00",
      "📍 EAT TOKYO JAKUZURE（東京都目黒区上目黒5-30-12）",
      "",
      "中身はこれから！音楽やったり、肉焼いたり、ゆるく交流する会です🍻",
      "続報＆参加登録は meatup.love で。 #meatup2026",
    ].join("\n"),
  );

const headCls =
  "font-[family-name:var(--font-display)] text-[34px] leading-none tracking-[0.02em] text-ink";

// People we're looking for. Hero's the headline; this is the next thing we
// want eyes on, so it sits right under the fold.
const WANTED = [
  { emoji: "🎧", label: "DJ やってくれるひと" },
  { emoji: "🍸", label: "スナック・バー やってくれるひと" },
  { emoji: "🛠", label: "運営 手伝ってくれるひと" },
];

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h2 className={headCls}>{children}</h2>
      <div className="mx-auto mt-3 h-[3px] w-10 rounded-full bg-meat/60" />
    </>
  );
}

function UnderConstruction({ title, note }: { title: string; note: string }) {
  return (
    <section className="w-full max-w-[440px] px-6 py-12 text-center">
      <SectionHead>{title}</SectionHead>
      <p className="mt-4">
        <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-paper px-4 py-1.5 text-[13px] font-bold text-ink-soft">
          🚧 準備中
        </span>
      </p>
      <p className="mt-2 text-[13px] text-ink-soft">{note}</p>
    </section>
  );
}

export default function Home() {
  return (
    // Invitation-card red frame on <main> itself (in-flow, never position:fixed)
    // so it wraps ALL sections and dodges Safari's dynamic-toolbar gap. The page
    // now scrolls through Hero → Wanted → Schedule/Content/Data → footer.
    <main className="flex min-h-lvh flex-col items-center border-[12px] border-meat bg-cream pb-[calc(2.5rem_+_env(safe-area-inset-bottom))] text-center">
      {/* ── HERO ── */}
      <section className="flex min-h-svh w-full flex-col items-center justify-center gap-4 px-4 pt-[calc(2.5rem_+_env(safe-area-inset-top))]">
        <BounceOniku className="h-[92px] w-[92px]" />

        <h1 className="font-[family-name:var(--font-display)] text-[clamp(56px,22vw,104px)] leading-[0.9] tracking-[0.02em] text-ink">
          meat<span className="text-meat">up</span>
        </h1>
        <span className="inline-block -rotate-2 rounded-pill bg-meat px-6 py-0.5 font-[family-name:var(--font-display)] text-[clamp(28px,9vw,44px)] text-white shadow-card">
          2026
        </span>

        <p className="mt-2 text-[20px] font-bold">お肉、食べようぜ！🍺</p>

        <div className="grid gap-1.5 text-[15px]">
          <p>📅 2026.07.25（土）</p>
          <p>⏰ 11:00 open 〜 19:00 close</p>
          <p>
            📍{" "}
            <a
              href="https://goo.gl/maps/NX273kTyHT5NrSvF8"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline underline-offset-2"
            >
              EAT TOKYO JAKUZURE
            </a>
          </p>
          <p>
            <a
              href={CAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] underline-offset-2 hover:underline"
            >
              📅 カレンダーに追加
            </a>
          </p>
        </div>

        <div className="mt-4 flex w-full max-w-[320px] flex-col gap-3">
          <Link className="btn btn--primary btn--block" href="/invite">
            招待された方はこちら →
          </Link>
          <Link className="btn btn--block" href="/ticket">
            チケットを見る
          </Link>
        </div>

        <TweetChip />
      </section>

      {/* ── WANTED （Hero の次に重要） ── */}
      <section className="w-full max-w-[440px] px-6 py-12 text-center">
        <SectionHead>
          Wanted <span className="align-middle">🙋</span>
        </SectionHead>
        <p className="mt-4 text-[14px] text-ink-soft">
          一緒に作ってくれる人、募集中！ピンと来たら連絡して。
        </p>
        <ul className="mt-5 grid gap-2.5 text-left">
          {WANTED.map((w) => (
            <li
              key={w.label}
              className="flex items-center gap-3 rounded-[12px] border-2 border-meat/30 bg-paper px-4 py-3 text-[15px] font-bold"
            >
              <span className="text-[22px]">{w.emoji}</span>
              {w.label}
            </li>
          ))}
        </ul>
        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-1 text-[13px] text-ink-soft">
          やりたい / 気になる人は →
          <a
            href={CONTACTS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram で連絡"
            className="inline-flex h-11 w-11 items-center justify-center text-[#E4405F] transition-colors hover:text-meat"
          >
            <InstagramIcon className="h-[22px] w-[22px]" />
          </a>
          <a
            href={CONTACTS.twitter}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter で連絡"
            className="inline-flex h-11 w-11 items-center justify-center text-[#1DA1F2] transition-colors hover:text-meat"
          >
            <TwitterIcon className="h-[22px] w-[22px]" />
          </a>
        </p>
      </section>

      {/* ── 工事中セクション ── */}
      <UnderConstruction title="Schedule" note="当日のタイムテーブル、準備中。" />
      <UnderConstruction title="Content" note="どんな企画があるか、準備中。" />
      <UnderConstruction title="Data" note="参加者の集計（職業・楽しみ など）、準備中。" />

      {/* ── フッター ── */}
      <footer className="mt-6 grid gap-1.5 px-4 text-[12px] text-ink-soft">
        <p>
          歴代 meatup：
          <a
            href="https://2018.meatup.love"
            target="_blank"
            rel="noopener noreferrer"
            className="text-meat underline-offset-2 hover:underline"
          >
            2018
          </a>
          {" / "}
          <a
            href="https://2019-summer.meatup.love"
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
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-1">
          わからんことあったら気軽にDM →
          <a
            href={CONTACTS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram で連絡"
            className="inline-flex h-11 w-11 items-center justify-center text-[#E4405F] transition-colors hover:text-meat"
          >
            <InstagramIcon className="h-[22px] w-[22px]" />
          </a>
          <a
            href={CONTACTS.twitter}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter で連絡"
            className="inline-flex h-11 w-11 items-center justify-center text-[#1DA1F2] transition-colors hover:text-meat"
          >
            <TwitterIcon className="h-[22px] w-[22px]" />
          </a>
        </p>
        <Link
          href="/admin"
          className="mt-1 text-[11px] text-ink-soft/50 transition-colors hover:text-ink-soft"
        >
          主催者ページ
        </Link>
      </footer>
    </main>
  );
}
