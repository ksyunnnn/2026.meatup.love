'use client'

// ビール試作：全変種 × 充填(10/50/80/100%) を実寸で（ローカルのみ・/preview は deploy 時に削除）。現状(div) 除外。
import type { ReactNode } from 'react'
import { A_SVG, A_CSS, A_Canvas, B_SVG, B_CSS, B_Canvas, Show_SVG, Show_Canvas, Show_CSS } from './concepts'

const S = 1.3 // ネイティブ120幅 → 本番グラス幅≈86px
const FILLS = [0.1, 0.5, 0.8, 1]

type Comp = (p: { pct: number }) => ReactNode
const VARIANTS: { label: string; tech: string; C: Comp }[] = [
  { label: 'A シズル線画', tech: 'SVG', C: A_SVG },
  { label: 'A シズル線画', tech: 'CSS', C: A_CSS },
  { label: 'A シズル線画', tech: 'Canvas', C: A_Canvas },
  { label: 'B フラットPop', tech: 'SVG', C: B_SVG },
  { label: 'B フラットPop', tech: 'CSS', C: B_CSS },
  { label: 'B フラットPop', tech: 'Canvas', C: B_Canvas },
  { label: '得意技 泡パーティクル', tech: 'Canvas', C: Show_Canvas },
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
    <div className="rounded-card border-[2.5px] border-ink bg-paper p-3 shadow-card">
      <p className="mb-2 text-[12px] font-bold text-ink-soft">
        {v.label} <span className="text-ink/40">· {v.tech}</span>
      </p>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-2">
        {FILLS.map((f) => (
          <div key={f} className="flex flex-col items-center">
            <Real><C pct={f} /></Real>
            <p className="mt-1 text-[11px] font-bold text-ink-soft">{Math.round(f * 100)}%</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BeerVariants() {
  return (
    <main className="min-h-lvh bg-cream px-6 pb-24 pt-10 text-ink">
      <style>{`
        @keyframes bubrise{0%{transform:translateY(0);opacity:0}12%{opacity:.75}100%{transform:translateY(-72px);opacity:0}}
        @keyframes shine{0%{transform:translateX(0)}55%{transform:translateX(150px)}100%{transform:translateX(150px)}}
      `}</style>
      <h1 className="text-center font-[family-name:var(--font-display)] text-[22px]">ビール 全変種 × 充填(10/50/80/100%) 実寸 🍺</h1>
      <p className="mt-1 text-center text-[12px] text-ink-soft">
        本番グラス幅 約86px・本番カード内。本番の現状は14%付近。現状(div)は除外。
      </p>

      <div className="mx-auto mt-8 flex max-w-[760px] flex-col gap-5">
        {VARIANTS.map((v) => (
          <VariantRow key={v.label + v.tech} v={v} />
        ))}
      </div>
    </main>
  )
}
