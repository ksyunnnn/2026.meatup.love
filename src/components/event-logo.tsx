// 会場スクリーン(/live)の左上に常設するイベントのブランドロックアップ。
// 狙い＝会場での撮影の背景に写り込んだとき「何のイベントか」が一目で伝わること。
// 意匠はチケット券面 / OGP（scripts/og/og.html・ticket-card.tsx）を踏襲：
//   Righteous ワードマーク meat+up ／ 2026 ピル（meat赤・-2deg）／ oniku マスコット。
// 暗い舞台(#0f0a0b)に載せるため、券面の「ink の meat」を cream に、「meat赤の up」を
// meat-light に置換して明度だけ反転（色相＝ブランドは維持）。全て 1600×900 の
// ステージ座標系（px は縮小フィット後も比率一定）。
import { Oniku } from './oniku'

// 暗背景での配色（ブランド色相は維持し、明度だけ反転）
const CREAM = '#f6e6d8' // 舞台既存の暖色クリーム（"meat" と日付）
const UP = '#ea6d6f' // meat-light（"up"＝ブランドの赤を暗背景でも視認できる明るさに）
const MEAT = '#b33d44' // 2026 ピル地（券面と同一）

export type LogoVariant = 'A' | 'B' | 'C'

function Pill({ size }: { size: number }) {
  return (
    <span
      className="inline-block font-[family-name:var(--font-display)]"
      style={{
        fontSize: size,
        background: MEAT,
        color: CREAM,
        borderRadius: 999,
        padding: `${Math.round(size * 0.05)}px ${Math.round(size * 0.7)}px`,
        transform: 'rotate(-2deg)', // 券面/OGP のピルと同じ遊び
        boxShadow: '0 6px 18px rgba(126,0,29,.35)',
        lineHeight: 1.15,
      }}
    >
      2026
    </span>
  )
}

function Date_({ size }: { size: number }) {
  return (
    <span
      className="font-[family-name:var(--font-display)]"
      style={{ fontSize: size, letterSpacing: '0.18em', color: `${CREAM}99` }}
    >
      2026.07.25&nbsp;SAT
    </span>
  )
}

function Wordmark({ size }: { size: number }) {
  return (
    <span
      className="font-[family-name:var(--font-display)]"
      style={{ fontSize: size, lineHeight: 0.9, letterSpacing: '0.01em', color: CREAM }}
    >
      meat<span style={{ color: UP }}>up</span>
    </span>
  )
}

// A｜チケット踏襲・横一列：券面の wordmark 組みをそのまま看板化した素直な案。
// 会場での撮影背景としての視認性を確保するため、券面よりやや大きめに組む。
function VariantA() {
  return (
    <div className="absolute left-7 top-6 flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <Oniku className="h-[52px] w-[52px] drop-shadow-[0_2px_8px_rgba(255,101,0,.25)]" />
        <span className="flex items-center gap-3">
          <Wordmark size={54} />
          <Pill size={24} />
        </span>
      </div>
      <div className="pl-[64px]">
        <Date_ size={16} />
      </div>
    </div>
  )
}

// B｜縦積みエンブレム：oniku を頂点に据え、ロゴ塊としての存在感を最大化した案。
function VariantB() {
  return (
    <div className="absolute left-7 top-6 flex flex-col items-start gap-2">
      <Oniku className="h-16 w-16 drop-shadow-[0_3px_12px_rgba(255,101,0,.3)]" />
      <Wordmark size={54} />
      <div className="flex items-center gap-3">
        <Pill size={20} />
        <Date_ size={15} />
      </div>
    </div>
  )
}

// C｜バックライト看板：横ロックアップを暖色グローのプレートに載せ、暗い会場でも
// “光る看板”として撮影背景に沈まないようにした案。
function VariantC() {
  return (
    <div
      className="absolute left-6 top-5 flex items-center gap-3.5 rounded-2xl px-5 py-3.5"
      style={{
        background: 'rgba(28,18,17,.55)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,160,71,.22)',
        boxShadow: '0 10px 40px -12px rgba(255,101,0,.35), inset 0 0 40px -20px rgba(255,160,71,.5)',
      }}
    >
      {/* oniku の背後に炎色のバックライト */}
      <div className="relative flex items-center justify-center">
        <span
          aria-hidden
          className="absolute h-14 w-14 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,101,0,.55), transparent 70%)', filter: 'blur(6px)' }}
        />
        <Oniku className="relative h-12 w-12" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <Wordmark size={40} />
          <Pill size={19} />
        </div>
        <Date_ size={14} />
      </div>
    </div>
  )
}

export default function EventLogo({ variant }: { variant: LogoVariant }) {
  if (variant === 'B') return <VariantB />
  if (variant === 'C') return <VariantC />
  return <VariantA />
}
