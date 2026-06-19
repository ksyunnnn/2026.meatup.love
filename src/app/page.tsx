import Link from "next/link";
import Image from "next/image";
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
  { emoji: "🎧", label: "DJやってくれる人" },
  { emoji: "🍸", label: "スナック・バーやってくれる人" },
  { emoji: "🛠", label: "運営ちょい手伝ってくれる人" },
];

// Venue photos (pre-resized into public/venue). The rooftop is the lead shot;
// these three sit below it. All are 1F except the rooftop terrace (3F).
const VENUE_SHOTS = [
  { src: "/venue/exterior.jpg", alt: "会場の外観。1階の入口" },
  { src: "/venue/space.jpg", alt: "1階の広いスペースとオープン厨房" },
  { src: "/venue/kitchen.jpg", alt: "1階の業務用厨房" },
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
    <section className="w-full max-w-[440px] px-6 py-16 text-center">
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

// One numbered step in "How to Join". Just a small meat badge and the text —
// no card chrome, so the list stays light and scannable.
function JoinStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 text-left">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-meat text-[13px] font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-snug">{title}</p>
        {children}
      </div>
    </li>
  );
}

// Hero block. Reused as the top splash (full-height, <h1>) and — with `compact` —
// as a closing recap at the very bottom: no min-height, and the wordmark is
// downgraded from <h1> so the page keeps a single <h1>.
function Hero({ compact = false }: { compact?: boolean }) {
  const Heading: "p" | "h1" = compact ? "p" : "h1";
  return (
    <section
      className={
        "flex w-full flex-col items-center justify-center gap-4 px-4 " +
        (compact
          ? "py-20"
          : "min-h-svh pt-[calc(2.5rem_+_env(safe-area-inset-top))]")
      }
    >
      {/* スプラッシュ（マスコット〜日時）。compact のときは PC で省く＝スクショの部分 */}
      <div className={"contents" + (compact ? " sm:hidden" : "")}>
        <BounceOniku className="h-[92px] w-[92px]" />

        <Heading className="font-[family-name:var(--font-display)] text-[clamp(56px,22vw,104px)] leading-[0.9] tracking-[0.02em] text-ink">
          meat<span className="text-meat">up</span>
        </Heading>
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
      </div>

      <div className="mt-4 flex w-full max-w-[320px] flex-col gap-3">
        <Link className="btn btn--primary btn--block" href="/invite">
          参加したいひとはこちら
        </Link>
        <Link className="btn btn--block" href="/mypage">
          参加登録済みの方こっち
        </Link>
      </div>

      <TweetChip />
    </section>
  );
}

export default function Home() {
  return (
    // Invitation-card red frame on <main> itself (in-flow, never position:fixed)
    // so it wraps ALL sections and dodges Safari's dynamic-toolbar gap. The page
    // now scrolls through Hero → Wanted → Schedule/Content/Data → footer.
    <main className="flex min-h-lvh flex-col items-center border-[12px] border-meat bg-cream pb-[calc(2.5rem_+_env(safe-area-inset-bottom))] text-center">
      {/* ── HERO（トップ：全画面・h1） ── */}
      <Hero />

      {/* ── ABOUT（さらっと・セクション扱いにしない軽い導入） ── */}
      <section className="w-full max-w-[420px] px-4 py-16 text-left text-[22px] font-bold leading-snug text-ink-soft">
        <p>お久しぶり！前回からまさかの6年ぶり〜。小学1年生だったあの子ももう中学生！タメになったね〜。</p>
        
        <p className="mt-4">来たことある人は全員参加してね。はじめましての人は不安よね、全員参加してね。みんなで肉食お🍖</p>
        
        <p className="mt-4">Meatupは肉を通してわいがや交流するイベントです🕺今までたくさんのひとたちに助けてもらいながら開催してきました！</p>

        <p className="mt-4">バーベキュー + 料理と酒だすよ！あとなんかいろいろ！今回もゆるく自由に楽しもうね✌</p>

        <p className="mt-4">お子様連れも歓迎できるようにしたいと思ってます。事前に教えてね！</p>        
      </section>

      {/* ── WANTED （Hero の次に重要） ── */}
      <section className="w-full max-w-[440px] px-6 py-16 text-center">
        <SectionHead>
          Wanted
        </SectionHead>
        <p className="mt-4 text-[14px] text-ink-soft font-bold">
          今のところ<span className="underline">運営こばしゅんのみ</span>！誰か助けて😭
        </p>
        <ul className="mx-auto mt-5 grid max-w-[290px] gap-3 text-[15px]">
          {WANTED.map((w) => (
            <li key={w.label} className="flex items-center justify-center gap-2">
              <span className="text-[20px]">{w.emoji}</span>
              <span className="font-bold">{w.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-1 text-[13px] text-ink-soft">
          やりたい！気になる！って人はこばしゅんに連絡を →
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

      {/* ── 会場 ── */}
      <section className="w-full max-w-[480px] px-6 py-16 text-center">
        <SectionHead>Venue</SectionHead>
        <p className="mt-4 text-[14px] font-bold text-ink-soft">会場こんなところ！</p>

        <div className="mt-6">
          <Image
            src="/venue/rooftop.jpg"
            alt="屋上テラス（3階）。夜のイルミネーションと長テーブル、奥に夜景"
            width={1500}
            height={1125}
            className="w-full rounded-[14px] border-2 border-line shadow-card"
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {VENUE_SHOTS.map((s) => (
            <div
              key={s.src}
              className="relative aspect-square overflow-hidden rounded-[8px] border border-line"
            >
              <Image src={s.src} alt={s.alt} fill sizes="160px" className="object-cover" />
            </div>
          ))}
        </div>

        <p className="mt-5 text-[13px]">
          📍{" "}
          <a
            href="https://goo.gl/maps/NX273kTyHT5NrSvF8"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-meat underline underline-offset-2"
          >
            EAT TOKYO JAKUZURE（地図）
          </a>
        </p>
      </section>

      {/* ── 工事中セクション ── */}
      <UnderConstruction title="Schedule" note="当日のタイムテーブルが入る予定" />
      <UnderConstruction title="Content" note="なんかできるかな〜" />
      <UnderConstruction title="Data" note="フォームで回答もらったやつをなんかうまくやりたい" />

      <section className="w-full max-w-[440px] px-6 py-16 text-center">
        <SectionHead>How to Join</SectionHead>
        <p className="mt-4 text-[14px] text-ink-soft">参加の流れはこんな感じ！</p>

        <ol className="mx-auto mt-6 grid max-w-[360px] list-none gap-5">
          <JoinStep n={1} title="招待ページから登録！">
            <Link
              className="mt-1 inline-block text-[13px] font-bold text-meat underline underline-offset-2"
              href="/invite"
            >
              招待ページへ →
            </Link>
          </JoinStep>

          <JoinStep n={2} title="確認と連絡を待つ！">
            <p className="mt-1 text-[13px] text-ink-soft">
              運営から招待があった場合はスキップ。2〜3日以内に連絡がなかったら直接連絡ください
              🙇‍♂️
            </p>
          </JoinStep>

          <JoinStep n={3} title="参加費を払う">
            <p className="mt-1 text-[13px] text-ink-soft">
              事前決済うれしす！Paypay コード送るよ！当日 5,000円・事前だと 4,500円！
            </p>
          </JoinStep>

          <JoinStep n={4} title="予定をカレンダーに追加">
            <p className="mt-1 text-[13px] text-ink-soft">
              
              👇️ここ押したらいい感じに追加できる！
              <a
                href={CAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-meat underline underline-offset-2 block"
              >
                📅 カレンダーに追加
              </a>
            </p>
          </JoinStep>

          <JoinStep n={5} title="肉を食う！酒を飲む！交流する！">
            <p className="mt-1 text-[18px]">🍖🍺🍖🍺🍖🍺</p>
          </JoinStep>
        </ol>
      </section>

      {/* ── フッター ── */}
      <footer className="mt-6 grid gap-1.5 px-4 text-[12px] text-ink-soft">
        <p>
          過去 LP：
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
          前回の開催の様子 →{" "}
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
          問い合わせ →
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
          className="mt-1 text-[11px] text-cream transition-colors hover:text-ink-soft"
        >
          管理ページ
        </Link>
      </footer>

      {/* ── 末尾：コンパクト版 Hero（recap CTA）。マスコット〜日時は PC で省く ── */}
      <Hero compact />
    </main>
  );
}
