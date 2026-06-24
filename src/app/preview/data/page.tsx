'use client'

// Data セクション 試作プレビュー（本番には未リンク・robotsで除外）。
// 1層目＝可視化の手法カタログ、2層目＝手法を組み合わせた案A/B/C。
// 実データ(approved 21人)の集計値を素材に、表現を「選ぶだけ」にするための比較画面。

import { useRef, useState } from 'react'
import { TOTAL } from '@/components/data-section/data'
import {
  SkewerRoster,
  CountUp,
  GenderDonut,
  JobBars,
  ExpectationStickers,
  DonenessMeter,
  MomentumSparkline,
} from '@/components/data-section/widgets'
import { DirectionA, DirectionB, DirectionC } from '@/components/data-section/directions'
import {
  BeerMug,
  Equalizer,
  ExpectationEq,
  CircularEq,
  ConcentricWaves,
  RippleField,
  Constellation,
  JobWordCloud,
  JobTags,
  JobGrill,
  JobWordsSimple,
} from '@/components/data-section/themes'

/** 各表現に使っている技術の併記用チップ。 */
function TechTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded border border-line bg-cream px-1.5 py-0.5 font-mono text-[10px] leading-tight text-ink-soft">
      {children}
    </span>
  )
}

/** 図の呼び名バッジ（会話で指示しやすいように各図に表示）。 */
function NameBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-pill border-2 border-ink bg-meat px-2.5 py-0.5 text-[12px] font-bold text-white">
      🏷 {children}
    </span>
  )
}

/** サブブロック用の小さい呼び名タグ。 */
function NameTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-pill bg-meat px-2 py-[2px] text-[11px] font-bold text-white">{children}</span>
  )
}

/** 手法カタログの図 → 呼び名 */
const METHOD_FIG: Record<string, string> = {
  'ピクトグラフ（串ロスター）': '串ラック',
  カウントアップ: 'カウンター',
  'ドーナツ（男女比）': '男女ドーナツ',
  '伸びるバー（職業）': '職業バー',
  'ステッカー（期待タグ）': '期待ステッカー',
  '焼け具合メーター（勢い）': '焼け具合メーター',
  'スパークライン（登録推移）': '推移スパークライン',
}

type Dir = 'A' | 'B' | 'C'

const DIRECTIONS: { id: Dir; name: string; blurb: string }[] = [
  { id: 'A', name: '炭火ロスター', blurb: '温かい・手描き寄り。串が1本ずつ着地（本命）' },
  { id: 'B', name: 'ステッカー食堂', blurb: 'ポップ／太影。全面に賑やか' },
  { id: 'C', name: '炭火アンビエント', blurb: '暗背景＋熾火のゆらぎ。新規性' },
]

const METHODS: { name: string; note: string; tech: string; demo: React.ReactNode }[] = [
  {
    name: 'ピクトグラフ（串ロスター）',
    note: '一人＝1串。n=21 を全員“見える化”。署名候補。',
    tech: 'SVG + CSS staggered（IntersectionObserver）',
    demo: <SkewerRoster gendered />,
  },
  {
    name: 'カウントアップ',
    note: 'NumberFlow で 0→21 が転がる。主役の数字に1回だけ。',
    tech: 'NumberFlow（@number-flow/react）',
    demo: (
      <div className="flex items-end justify-center gap-1">
        <CountUp value={TOTAL} className="font-[family-name:var(--font-display)] text-[56px] leading-none text-meat" />
        <span className="pb-2 font-bold text-ink">人</span>
      </div>
    ),
  },
  {
    name: 'ドーナツ（男女比）',
    note: 'stroke-dasharray。視界で弧が伸びる。集計値のみ。',
    tech: 'SVG stroke-dasharray + CSS transition',
    demo: <GenderDonut />,
  },
  {
    name: '伸びるバー（職業）',
    note: 'CSS幅トランジション。多い順に並べるだけで読める。',
    tech: 'CSS width transition',
    demo: <JobBars />,
  },
  {
    name: 'ステッカー（期待タグ）',
    note: '肉/繋がり/酒/遊び を回転バッジで。複数回答に強い。',
    tech: 'CSS（flex / transform / box-shadow）',
    demo: <ExpectationStickers />,
  },
  {
    name: '焼け具合メーター（勢い）',
    note: 'レア→焼き上がり。盛り上がりを肉の語彙で。',
    tech: 'CSS gradient + shimmer keyframes',
    demo: <DonenessMeter />,
  },
  {
    name: 'スパークライン（登録推移）',
    note: '累計の折れ線。“埋まっていく”勢いを1本で。',
    tech: 'SVG path + stroke-dashoffset',
    demo: <MomentumSparkline w={260} h={70} />,
  },
]

export default function DataPreview() {
  const [dir, setDir] = useState<Dir>('A')
  const layer2Ref = useRef<HTMLElement>(null)
  // タブは画面下の②案だけを差し替える。上部にいると変化が見えず「無反応」に
  // 感じるので、押したら②案へスクロールして“効いた”ことを必ず見せる。
  const choose = (id: Dir) => {
    setDir(id)
    requestAnimationFrame(() =>
      layer2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }
  return (
    <main className="min-h-lvh bg-cream pb-24 text-ink">
      {/* ヘッダ＋案タブ */}
      <header className="sticky top-0 z-20 border-b-[2.5px] border-ink bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-[480px] flex-col gap-2 px-4 py-3">
          <p className="font-[family-name:var(--font-display)] text-[20px] leading-none">Data セクション 試作</p>
          <p className="text-[11px] text-ink-soft">実データ(approved {TOTAL}人)で表現を比較。下段の案をタブで切替。</p>
          <div className="mt-1 flex gap-2">
            {DIRECTIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => choose(d.id)}
                className="flex-1 rounded-pill border-2 px-2 py-2 text-[12px] font-bold transition-colors"
                style={{
                  background: dir === d.id ? 'var(--color-meat)' : 'var(--color-paper)',
                  color: dir === d.id ? '#fff' : 'var(--color-ink)',
                  borderColor: 'var(--color-ink)',
                }}
              >
                案{d.id}
                <span className="block text-[10px] font-normal opacity-80">{d.name}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 1層目：手法カタログ */}
      <section className="mx-auto max-w-[480px] px-4 pt-8">
        <h1 className="font-[family-name:var(--font-display)] text-[22px]">① 可視化の手法</h1>
        <p className="mt-1 text-[12px] text-ink-soft">それぞれを“部品”として、下の案で組み合わせています。</p>
        <div className="mt-5 grid gap-3.5">
          {METHODS.map((m) => (
            <div key={m.name} className="rounded-card border-[2.5px] border-ink bg-paper p-4 shadow-card">
              <p className="mb-1"><NameBadge>{METHOD_FIG[m.name]}</NameBadge></p>
              <p className="text-[12px] font-bold text-ink-soft">{m.name}</p>
              <p className="mb-2 text-[11px] text-ink-soft">{m.note}</p>
              <p className="mb-3"><TechTag>🛠 {m.tech}</TechTag></p>
              <div className="rounded-[10px] bg-cream/70 px-3 py-4">{m.demo}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 2層目：手法を組み合わせた案 */}
      <section ref={layer2Ref} className="mt-12 scroll-mt-[132px]">
        <div className="mx-auto max-w-[480px] px-4">
          <h1 className="font-[family-name:var(--font-display)] text-[22px]">② 手法を組み合わせた案</h1>
          <p className="mt-1 text-[12px] text-ink-soft">
            {DIRECTIONS.find((d) => d.id === dir)!.name} — {DIRECTIONS.find((d) => d.id === dir)!.blurb}
          </p>
        </div>
        <div className="mt-5 flex justify-center">
          {dir === 'A' && <DirectionA />}
          {dir === 'B' && <DirectionB />}
          {dir === 'C' && <DirectionC />}
        </div>
      </section>

      {/* 3層目：テーマ別の“感じ”バリエーション */}
      <section className="mx-auto mt-14 max-w-[480px] px-4">
        <h1 className="font-[family-name:var(--font-display)] text-[22px]">③ テーマ別バリエーション</h1>
        <p className="mt-1 text-[12px] text-ink-soft">🍖以外の“感じ”も。案の部品として差し替え・追加できます。</p>
        <div className="mt-5 grid gap-3.5">
          <div className="rounded-card border-[2.5px] border-ink bg-paper p-4 shadow-card">
            <p className="mb-1"><NameBadge>ビールジョッキ</NameBadge></p>
            <p className="text-[14px] font-bold">🍺 ビール感 — ジョッキが満ちる</p>
            <p className="mb-2 text-[11px] text-ink-soft">参加が増えるほどビールが注がれ泡立つ。人数/勢いの別表現。</p>
            <p className="mb-3"><TechTag>🛠 CSS（clip + bubble keyframes）</TechTag></p>
            <div className="rounded-[10px] bg-cream/70 px-3 py-5"><BeerMug pct={0.82} label="あと少しで満タン" /></div>
          </div>

          <div className="rounded-card border-[2.5px] border-ink bg-paper p-4 shadow-card">
            <p className="text-[14px] font-bold">🎧 遊び感 — イコライザー</p>
            <p className="mb-2 text-[11px] text-ink-soft">厳密値より動きで楽しく。<b>円形の音波形</b>で期待タグ集計を、装飾EQで音のノリを。</p>
            <p className="mb-3"><TechTag>🛠 CSS keyframes（放射状divをrotate＋scaleY / 縦scaleY）</TechTag></p>
            <div className="grid gap-3">
              <div className="rounded-[10px] bg-cream/70 px-3 py-5">
                <p className="mb-1 text-center"><NameTag>円形EQ</NameTag></p>
                <p className="mb-1 text-center text-[10px] text-ink-soft">放射状バーの円・期待タグ集計</p>
                <CircularEq />
              </div>
              <div className="rounded-[10px] bg-cream/70 px-3 py-5">
                <p className="mb-1 text-center"><NameTag>水紋ドラム</NameTag></p>
                <p className="mb-1 text-center text-[10px] text-ink-soft">4点から心拍の波紋（絵文字が中心）</p>
                <RippleField />
              </div>
              <div className="rounded-[10px] bg-cream/70 px-3 py-5">
                <p className="mb-1 text-center"><NameTag>水紋＋連動EQ ⭐</NameTag></p>
                <p className="mb-1 text-center text-[10px] text-ink-soft">水紋＋背景EQ（部分一致・最新）</p>
                <RippleField withEq />
              </div>
              <div className="rounded-[10px] bg-cream/70 px-3 py-5">
                <p className="mb-1 text-center"><NameTag>花リング</NameTag></p>
                <p className="mb-1 text-center text-[10px] text-ink-soft">1中心の同心円・花形（参考）</p>
                <ConcentricWaves />
              </div>
              <div className="rounded-[10px] bg-ink/90 px-3 py-4">
                <p className="mb-1 text-center"><NameTag>装飾EQ</NameTag></p>
                <p className="mb-2 text-center text-[10px] text-cream/70">飾りのイコライザー（音のノリ）</p>
                <Equalizer />
              </div>
              <div className="rounded-[10px] bg-cream/70 px-3 py-4">
                <p className="mb-1 text-center"><NameTag>縦EQ</NameTag></p>
                <p className="mb-2 text-center text-[10px] text-ink-soft">縦棒の音量（比較）</p>
                <ExpectationEq />
              </div>
            </div>
          </div>

          <div className="rounded-card border-[2.5px] border-ink bg-paper p-4 shadow-card">
            <p className="mb-1"><NameBadge>繋がりコンステ</NameBadge></p>
            <p className="text-[14px] font-bold">🤝 繋がり感 — コンステレーション</p>
            <p className="mb-2 text-[11px] text-ink-soft">参加者をノード、交わりをラインで。“繋がる場”の雰囲気（男女で色分け）。</p>
            <p className="mb-3"><TechTag>🛠 SVG（計算ノード）+ CSS twinkle</TechTag></p>
            <div className="rounded-[10px] bg-cream/70 px-2 py-3"><Constellation /></div>
          </div>

          <div className="rounded-card border-[2.5px] border-ink bg-paper p-4 shadow-card">
            <p className="text-[14px] font-bold">☁️ 職業ワードクラウド（自由入力込み）</p>
            <p className="mb-2 text-[11px] text-ink-soft">固定カテゴリ＋「その他」の自由記述が浮かぶ。4種を比較。</p>
            <p className="mb-3"><TechTag>🛠 CSS（flex / font-size / transform）｜グリル＝repeating-linear-gradient</TechTag></p>
            <div className="grid gap-3">
              <div className="rounded-[10px] bg-cream/70 px-3 py-5">
                <p className="mb-2"><NameTag>ワードクラウド〔雲〕</NameTag> <span className="text-[10px] text-ink-soft">サイズで頻度</span></p>
                <JobWordCloud />
              </div>
              <div className="rounded-[10px] bg-cream/70 px-3 py-5">
                <p className="mb-3"><NameTag>ワードクラウド〔タグ〕</NameTag> <span className="text-[10px] text-ink-soft">チップ＋件数</span></p>
                <JobTags />
              </div>
              <div>
                <p className="mb-2"><NameTag>ワードクラウド〔グリル〕</NameTag> <span className="text-[10px] text-ink-soft">網の上の肉</span></p>
                <JobGrill />
              </div>
              <div className="rounded-[10px] bg-cream/70 px-3 py-5">
                <p className="mb-2"><NameTag>ワードクラウド〔シンプル〕</NameTag> <span className="text-[10px] text-ink-soft">中黒区切り</span></p>
                <JobWordsSimple />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
