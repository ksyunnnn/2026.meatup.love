import Image from "next/image";

// 当日、場をつくってくれる仲間たち（DJ・料理人・ワイン…）。役割は先に確定、
// 名前/屋号・Insta・顔写真は本人から届き次第 FRIENDS に追記する。
// name/insta/photo が全部そろった人だけ表示（未入力の人は出さない）。
// 顔写真は正方形（推奨 500×500 以上）を public/friends/ に置く＝円形に切り抜き表示。
// 増員は配列に1件足すだけ（2列グリッドが自動で埋まる）。

// meatup の4本柱でタグ付け（＝この人が持ち込むもので分類）。絵文字はここが真実の源。
const THEME = {
  meat: "🍖", // 肉・料理
  drink: "🍺", // 酒・ドリンク
  music: "🎧", // 音楽・DJ
  connect: "🤝", // 交流・運営・ホスト
} as const;
type Theme = keyof typeof THEME;

type Friend = {
  theme: Theme; // 4本柱のどれを持ち込むか
  role: string; // 肩書き＝軽い紹介文
  name: string; // 名前 or 屋号
  insta: string; // @なしのハンドル（無い人は "" ＝ リンクを出さない）
  photo: string; // 例: "/friends/dj.jpg"（正方形）
};

const FRIENDS: Friend[] = [
  { theme: "music", role: "DJ from 高円寺", name: "Reed", insta: "bbqsauceandspice", photo: "/friends/reed.jpg" },
  { theme: "meat", role: "料理するひと", name: "Naoki Kimura", insta: "kmnaoki_1118", photo: "/friends/naoki.jpg" },
  { theme: "drink", role: "ワインと野菜にやさしい", name: "KOHEi", insta: "winetokotoba", photo: "/friends/kohei.jpg" },
  { theme: "connect", role: "スナックのママ", name: "trkrtps", insta: "", photo: "/friends/trkrtps.png" },
];

// insta は任意（無い人も出す）。name と photo が揃っていれば表示。
const READY = FRIENDS.filter((f) => f.name && f.photo);

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

export function FriendsSection() {
  // 表示できる仲間がまだ居なければセクションごと出さない（素材待ちの間）。
  if (READY.length === 0) return null;

  return (
    <section className="w-full max-w-[440px] px-6 py-16 text-center">
      <SectionHead>Meat Mates</SectionHead>
      <p className="mx-auto mt-4 mb-8 max-w-[300px] text-[14px] text-ink-soft">
        当日の賑やかし仲間✌
      </p>

      {/* PC でも本体は細い1カラムなので 2列固定。名前/肩書き/Insta は高さを
          予約して行を揃える（折れても互い違いにならない）。 */}
      <div className="mx-auto grid max-w-[340px] grid-cols-2 gap-x-4 gap-y-7">
        {READY.map((f) => (
          <div key={f.name} className="flex min-w-0 flex-col items-center text-center">
            <div className="relative w-full max-w-[130px]">
              <div className="relative aspect-square overflow-hidden rounded-full border-[2.5px] border-ink shadow-card">
                <Image src={f.photo} alt={f.name} fill sizes="130px" className="object-cover" />
              </div>
              {/* テーマ（4本柱）のバッジ。写真に紐づく＝この人の分類、と一目で分かる */}
              <span
                className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-paper text-[15px] leading-none shadow-card"
                aria-hidden
              >
                {THEME[f.theme]}
              </span>
            </div>
            {/* アイデンティティ＝顔・名前・ID を一塊に（写真の直下に名前、IDを密着） */}
            <p className="mt-3 font-bold leading-tight text-ink">{f.name}</p>
            {/* insta がある人だけリンク。無い人は高さだけ予約して行を揃える */}
            {f.insta ? (
              <a
                href={`https://instagram.com/${f.insta}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${f.name} の Instagram`}
                className="mt-0.5 block max-w-full truncate text-[11px] font-semibold text-ink-soft/70 transition-colors hover:text-meat"
              >
                @{f.insta}
              </a>
            ) : (
              <span className="mt-0.5 block text-[11px] leading-[1.2]" aria-hidden>
                &nbsp;
              </span>
            )}
            {/* ディスクリプタ（何をする人か）＝バッジと同カテゴリ。少し離して分離 */}
            <p className="mt-3 text-[12px] font-bold leading-tight text-ink-soft">{f.role}</p>
          </div>
        ))}

        {/* 空席のダッシュ丸＝「ここ、きみの席かも」。How to Join へ誘導 */}
        <a
          href="#join"
          className="flex flex-col items-center text-center text-ink-soft transition-colors hover:text-meat"
        >
          <span className="flex aspect-square w-full max-w-[130px] items-center justify-center rounded-full border-[2.5px] border-dashed border-line text-[36px] leading-none">
            +
          </span>
          <span className="mt-3 font-[family-name:var(--font-display)] text-[16px] leading-tight">and You 👻</span>
        </a>
      </div>
    </section>
  );
}
