'use client'

// ビール試作：全変種 × 充填(10/50/80/100%) を実寸で（ローカルのみ・/preview は deploy 時に削除）。現状(div) 除外。
// いまの検討中＝3候補（A·CSS / A·Canvas / 得意技泡パーティクル·Canvas）を上段に固定。
import type { ReactNode } from 'react'
import { A_SVG, A_CSS, A_Canvas, B_SVG, B_CSS, B_Canvas, Show_SVG, Show_Canvas, Show_CSS } from './concepts'

const S = 1.3 // ネイティブ120幅 → 本番グラス幅≈86px
const FILLS = [0.1, 0.5, 0.8, 1]

type Comp = (p: { pct: number; hype?: number }) => ReactNode
const HYPES = [
  { lv: 1, label: 'あふれ(リアル)' },
  { lv: 4, label: 'あふれ(絵文字調)' },
  { lv: 2, label: '噴き出し' },
  { lv: 3, label: '最高潮' },
]
const VARIANTS: { label: string; tech: string; C: Comp; cand?: boolean }[] = [
  // ── 検討中の3候補（上段） ──
  { label: 'A シズル線画', tech: 'CSS', C: A_CSS, cand: true },
  { label: 'A シズル線画', tech: 'Canvas', C: A_Canvas, cand: true },
  { label: '得意技 泡パーティクル', tech: 'Canvas', C: Show_Canvas, cand: true },
  // ── 参考（残しておく他の変種） ──
  { label: 'A シズル線画', tech: 'SVG', C: A_SVG },
  { label: 'B フラットPop', tech: 'SVG', C: B_SVG },
  { label: 'B フラットPop', tech: 'CSS', C: B_CSS },
  { label: 'B フラットPop', tech: 'Canvas', C: B_Canvas },
  { label: '得意技 フィルタ&マスク', tech: 'SVG', C: Show_SVG },
  { label: '得意技 ブレンド&3D', tech: 'CSS', C: Show_CSS },
]

function Real({ children }: { children: ReactNode }) {
  return (
    <div style={{ width: S * 120, height: S * 150, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${S})`, transformOrigin: 'top left' }}>{children}</div>
    </div>
  )
}

function VariantRow({ v }: { v: (typeof VARIANTS)[number] }) {
  const C = v.C
  return (
    <div className={'rounded-card border-[2.5px] bg-paper p-3 shadow-card ' + (v.cand ? 'border-meat' : 'border-ink')}>
      <p className="mb-2 text-[12px] font-bold text-ink-soft">
        {v.cand && <span className="mr-1.5 rounded-pill bg-meat px-1.5 py-0.5 text-[10px] text-white">候補</span>}
        {v.label} <span className="text-ink/40">· {v.tech}</span>
      </p>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-2">
        {FILLS.map((f) => (
          <div key={f} className="flex flex-col items-center">
            <Real><C pct={f} /></Real>
            <p className="mt-1 text-[11px] font-bold text-ink-soft">{Math.round(f * 100)}%</p>
          </div>
        ))}
        {v.cand &&
          HYPES.map((h) => (
            <div key={h.lv} className="flex flex-col items-center">
              <Real><C pct={1} hype={h.lv} /></Real>
              <p className="mt-1 text-[11px] font-bold text-meat">{h.label}</p>
            </div>
          ))}
      </div>
    </div>
  )
}

export default function BeerVariants() {
  const cands = VARIANTS.filter((v) => v.cand)
  const rest = VARIANTS.filter((v) => !v.cand)
  return (
    <main className="min-h-lvh bg-cream px-6 pb-24 pt-10 text-ink">
      <style>{`
        @keyframes bubrise{0%{transform:translateY(0);opacity:0}12%{opacity:.75}100%{transform:translateY(-72px);opacity:0}}
        @keyframes shine{0%{transform:translateX(0)}55%{transform:translateX(150px)}100%{transform:translateX(150px)}}
      `}</style>
      <h1 className="text-center font-[family-name:var(--font-display)] text-[22px]">ビール 候補比較 × 充填(10/50/80/100%) 実寸 🍺</h1>
      <p className="mt-1 text-center text-[12px] text-ink-soft">
        上段＝検討中の3候補。下段＝参考（他の変種）。本番グラス幅 約86px・現状は14%付近。
      </p>

      <div className="mx-auto mt-8 flex max-w-[1160px] flex-col gap-5">
        {cands.map((v) => (
          <VariantRow key={v.label + v.tech} v={v} />
        ))}

        <div className="my-1 flex items-center gap-3 text-[12px] font-bold text-ink-soft">
          <span className="h-px flex-1 bg-ink/15" />参考（他の変種・残置）<span className="h-px flex-1 bg-ink/15" />
        </div>

        {rest.map((v) => (
          <VariantRow key={v.label + v.tech} v={v} />
        ))}
      </div>
    </main>
  )
}
