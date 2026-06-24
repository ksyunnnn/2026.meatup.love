'use client'

// Data セクションの3方向（案A/B/C）。同じ可視化部品を別の世界観で構成する。
// それぞれ「トップに丸ごと挿す」想定の完成イメージ。

import type { ReactNode } from 'react'
import { TOTAL, MOMENTUM } from './data'
import {
  SkewerRoster,
  CountUp,
  GenderDonut,
  JobBars,
  ExpectationStickers,
  DonenessMeter,
  MomentumSparkline,
  MicroLabel,
} from './widgets'

const headCls =
  'font-[family-name:var(--font-display)] text-[30px] leading-none tracking-[0.02em] text-ink'

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <>
      <h2 className={headCls}>{children}</h2>
      <div className="mx-auto mt-3 h-[3px] w-10 rounded-full bg-meat/60" />
    </>
  )
}

function Tile({
  children,
  className = '',
  brutal = false,
}: {
  children: ReactNode
  className?: string
  brutal?: boolean
}) {
  return (
    <div
      className={
        'rounded-card border-[2.5px] border-ink bg-paper p-4 ' +
        (brutal ? 'shadow-[5px_5px_0_var(--color-ink)] ' : 'shadow-card ') +
        className
      }
    >
      {children}
    </div>
  )
}

function TileLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[12px] font-bold text-ink-soft">{children}</p>
}

// ════════════════════════════════════════════════════════════════════════════
// 案A — 炭火ロスター（温かい・手描き寄り）。署名＝串が1本ずつ着地。
// ════════════════════════════════════════════════════════════════════════════
export function DirectionA() {
  return (
    <section className="w-full max-w-[440px] px-5 py-12 text-center">
      <SectionHead>Data</SectionHead>
      <p className="mt-3 text-[13px] font-bold text-ink-soft">いま、こんな会になってきてる🔥</p>

      {/* 署名：串ラック */}
      <div className="mt-7">
        <SkewerRoster gendered />
        <p className="mt-4 flex items-end justify-center gap-1.5">
          <CountUp value={TOTAL} confettiOnArrive className="font-[family-name:var(--font-display)] text-[64px] leading-none text-meat" />
          <span className="pb-2 text-[20px] font-bold text-ink">人 集合</span>
        </p>
        <p className="mt-1"><MicroLabel>LOT.2026 / {TOTAL} PORTIONS / WELL-MIXED</MicroLabel></p>
      </div>

      {/* 脇役：ベント */}
      <div className="mt-8 grid grid-cols-2 gap-3 text-left">
        <Tile className="col-span-2">
          <TileLabel>登録の伸び（埋まってきてる）</TileLabel>
          <MomentumSparkline />
          <p className="mt-1 text-right text-[11px] text-ink-soft">{MOMENTUM[0].date}→{MOMENTUM[MOMENTUM.length - 1].date}</p>
        </Tile>
        <Tile>
          <TileLabel>男女比</TileLabel>
          <GenderDonut size={116} />
        </Tile>
        <Tile>
          <TileLabel>職業</TileLabel>
          <JobBars />
        </Tile>
        <Tile className="col-span-2">
          <TileLabel>みんなの“狙い”</TileLabel>
          <ExpectationStickers />
        </Tile>
        <Tile className="col-span-2">
          <TileLabel>盛り上がり度</TileLabel>
          <DonenessMeter />
        </Tile>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 案B — ステッカー食堂（ポップ／ネオブルータリスト）。太影＋回転で全面に賑やか。
// ════════════════════════════════════════════════════════════════════════════
export function DirectionB() {
  return (
    <section className="w-full max-w-[440px] px-5 py-12 text-center">
      <span className="inline-block -rotate-2 rounded-pill border-[2.5px] border-ink bg-flame px-4 py-1 font-[family-name:var(--font-display)] text-[24px] text-white shadow-[4px_4px_0_var(--color-ink)]">
        DATA
      </span>
      <p className="mt-4 text-[13px] font-bold text-ink-soft">数字でわいわい見る</p>

      <div className="mt-6 grid grid-cols-2 gap-3.5 text-left">
        {/* 主役の数字＋串を1枚に */}
        <Tile brutal className="col-span-2 text-center">
          <div className="flex items-end justify-center gap-1.5">
            <CountUp value={TOTAL} confettiOnArrive className="font-[family-name:var(--font-display)] text-[60px] leading-none text-meat" />
            <span className="pb-2 text-[18px] font-bold text-ink">人が集合🎉</span>
          </div>
          <div className="mt-3"><SkewerRoster gendered={false} /></div>
        </Tile>

        <Tile brutal className="col-span-2">
          <TileLabel>みんなの“狙い”（複数回答）</TileLabel>
          <ExpectationStickers brutal />
        </Tile>

        <Tile brutal>
          <TileLabel>男女比</TileLabel>
          <GenderDonut size={112} />
        </Tile>
        <Tile brutal>
          <TileLabel>職業</TileLabel>
          <JobBars />
        </Tile>

        <Tile brutal className="col-span-2">
          <TileLabel>登録の伸び＆盛り上がり</TileLabel>
          <MomentumSparkline />
          <div className="mt-3"><DonenessMeter /></div>
        </Tile>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 案C — 炭火アンビエント（新規性）。背後に熾火のゆらぎ、数字は静かなDOM。
// ════════════════════════════════════════════════════════════════════════════
export function DirectionC() {
  return (
    <section className="relative w-full overflow-hidden bg-ink px-5 py-16 text-center">
      {/* 熾火レイヤー（CSSのみ・aria-hidden・reduced-motionで静止） */}
      <div className="ds-ember pointer-events-none absolute inset-x-0 bottom-0 h-[70%]" aria-hidden />
      <div className="pointer-events-none absolute inset-0" aria-hidden style={{ background: 'radial-gradient(120% 60% at 50% 120%, rgba(255,101,0,0.35), transparent 60%)' }} />

      <div className="relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/60">meatup 2026 — live</p>
        <p className="mt-5 flex items-end justify-center gap-1.5">
          <CountUp value={TOTAL} confettiOnArrive className="font-[family-name:var(--font-display)] text-[80px] leading-none text-cream" />
          <span className="pb-3 text-[18px] font-bold text-cream/80">人</span>
        </p>
        <p className="mt-1 text-[13px] font-bold text-flame">炭火、もう温まってる🔥</p>

        {/* 串：暗背景に白系で */}
        <div className="mt-7 [&_*]:!text-cream">
          <div className="flex flex-wrap items-end justify-center gap-x-1 gap-y-2 opacity-90">
            <SkewerRoster gendered={false} />
          </div>
        </div>

        <div className="mx-auto mt-8 grid max-w-[360px] gap-3 text-left">
          <div className="rounded-card border border-cream/20 bg-cream/5 p-4 backdrop-blur-sm">
            <p className="mb-2 text-[12px] font-bold text-cream/70">登録の伸び</p>
            <div className="[&_path]:!stroke-flame [&_circle]:!fill-flame"><MomentumSparkline /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-card border border-cream/20 bg-cream/5 p-4">
              <p className="mb-2 text-[12px] font-bold text-cream/70">男女比</p>
              <div className="[&_circle]:first:!stroke-cream/25 [&_span]:!text-cream"><GenderDonut size={104} /></div>
            </div>
            <div className="rounded-card border border-cream/20 bg-cream/5 p-4">
              <p className="mb-3 text-[12px] font-bold text-cream/70">狙い</p>
              <ExpectationStickers />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
