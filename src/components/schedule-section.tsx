// 当日のタイムテーブル。内容はオーナー提供のまま。時刻を meat 赤の表示フォント
// 左列に、内容を右に置く二列レイアウト（枠なし・薄い罫線だけ）。派手さは足さない。
// `by` は当日を作る Meat Mate（Friends 節の3人と一致）。DJ だけ「and You」＝
// 参加者も主役、という誘い。増減は SLOTS を編集するだけ。

const headCls =
  "font-[family-name:var(--font-display)] text-[34px] leading-none tracking-[0.02em] text-ink";

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h2 className={headCls}>{children}</h2>
      <div className="mx-auto mt-3 h-[3px] w-10 rounded-full bg-meat/60" />
    </>
  );
}

type Slot = {
  time: string; // 開始時刻（表示フォントの主役・全行 HH:MM で揃う）
  end?: string; // 範囲の終わり（"–13:00" と下に小さく）。無い行は次の予定まで続く
  title: string;
  emoji?: string;
  by?: string; // 場をつくる人（Meat Mate）
  you?: boolean; // "and You"＝参加者も主役、という誘い（DJ）
};

const SLOTS: Slot[] = [
  { time: "11:00", title: "開場" },
  { time: "12:00", title: "乾杯・肉焼き始め", emoji: "🔥" },
  { time: "12:30", end: "13:00", title: "賑やかし料理", by: "Naoki" },
  { time: "13:00", end: "14:00", title: "わいわい" },
  { time: "14:00", title: "ワイン企画", by: "KOHEi" },
  { time: "15:00", title: "DJ", emoji: "🎧", by: "Reed", you: true },
  { time: "17:00", end: "18:00", title: "集合写真とか撮りたい", emoji: "📸" },
  { time: "18:00", end: "19:00", title: "みんなで撤収" },
];

// 「誰がつくるか」を軽く見せるピル。DJ の "and You" は参加者への誘いなので
// ひとつ濃い meat-dark で少し立てる（クレジットではなく“おいでよ”のトーン）。
function ByPill({ name, you }: { name: string; you?: boolean }) {
  return (
    <span className="ml-1.5 inline-block whitespace-nowrap rounded-pill bg-meat/10 px-2 py-0.5 align-middle text-[11px] font-bold text-meat">
      by {name}
      {you && <span className="text-ink-soft"> and You</span>}
    </span>
  );
}

export function ScheduleSection() {
  return (
    <section className="w-full max-w-[440px] px-6 py-16 text-center">
      <SectionHead>Schedule</SectionHead>
      <p className="mt-4 mb-8 text-[14px] text-ink-soft">当日のながれ 🍖</p>

      <dl className="mx-auto max-w-[360px] text-left">
        {SLOTS.map((s, i) => (
          <div
            key={i}
            className={
              "grid grid-cols-[72px_1fr] items-baseline gap-x-4 py-3 " +
              (i ? "border-t border-line" : "")
            }
          >
            <dt className="whitespace-nowrap text-right leading-none">
              <span className="font-[family-name:var(--font-display)] text-[18px] text-meat">
                {s.time}
              </span>
              {s.end && <span className="mt-1 block text-[10px] text-ink-soft">–{s.end}</span>}
            </dt>
            <dd className="font-bold leading-snug text-ink">
              {s.title}
              {s.emoji ? ` ${s.emoji}` : ""}
              {s.by && <ByPill name={s.by} you={s.you} />}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
