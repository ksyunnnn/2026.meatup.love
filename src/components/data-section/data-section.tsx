'use client'

// トップに載せる本番の Data セクション（案A＝炭火ロスター系の落ち着いた構成）。
// 採用図：カウンター＋男女ドーナツ / 水紋ドラム / ワードクラウド〔タグ〕 / ビールジョッキ。
// データは公開 stats を購読（useStats）。未作成時は現時点のスナップショットにフォールバック。
// 紙吹雪（クラッカー）は無し。

import { type ReactNode } from 'react'
import { useStats } from '@/lib/stats'
import {
  TOTAL,
  GENDER,
  EXPECTATIONS,
  JOB_WORDS,
} from './data'
import { CountUp, GenderDonut, clientNow, useMounted } from './widgets'
import { RippleField, JobTags } from './themes'
import { BeerMug } from './beer-mug'

const headCls =
  'font-[family-name:var(--font-display)] text-[34px] leading-none tracking-[0.02em] text-ink'

function Tile({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={'rounded-card border-[2.5px] border-ink bg-paper p-4 shadow-card ' + className}>
      {children}
    </div>
  )
}

function TileLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[12px] font-bold text-ink-soft">{children}</p>
}

// 開催日(2026-07-25)に向けて満ちるビール。
// 0%→100% は START〜3日前(FULL)で滑らかに刻む。3日前〜前日は100%でキープ。当日(EVENT_DAY)に120%へジャンプ＋揺れ。
const EVENT_MS = new Date('2026-07-25T11:00:00+09:00').getTime() // 開催時刻（残り日数表示用）
const EVENT_DAY_MS = new Date('2026-07-25T00:00:00+09:00').getTime() // 当日0時＝120%＆jiggle開始
const FULL_MS = new Date('2026-07-22T00:00:00+09:00').getTime() // 3日前＝満タン100%到達
const START_MS = new Date('2026-06-19T00:00:00+09:00').getTime()

export function DataSection() {
  const stats = useStats()

  const total = stats?.total ?? TOTAL
  const maleN = stats?.gender.male ?? GENDER[0].n
  const femaleN = stats?.gender.female ?? GENDER[1].n
  const jobWords = stats?.jobWords ?? JOB_WORDS
  const expData = stats
    ? stats.expectations.map((s) => {
        const meta = EXPECTATIONS.find((e) => e.key === s.key)
        return { key: s.key, label: meta?.label ?? s.key, n: s.n, emoji: meta?.emoji ?? '•' }
      })
    : EXPECTATIONS

  // 開催までの割合は当日の値なので、ハイドレーション差を避けてマウント後に算出。
  // 状態には持たず描画時に導出する（effect からの setState は cascading render）。
  const mounted = useMounted()
  const now = mounted ? clientNow() : 0
  // 3日前(FULL)で100%到達、それ以降は100%キープ。当日の120%は dayOf 側で表現。
  const beerPct = mounted ? Math.max(0, Math.min(1, (now - START_MS) / (FULL_MS - START_MS))) : 0
  const dayOf = mounted && now >= EVENT_DAY_MS
  const daysLeft = mounted ? Math.max(0, Math.ceil((EVENT_MS - now) / 86_400_000)) : null

  return (
    <section className="w-full max-w-[440px] px-5 py-16 text-center">
      <h2 className={headCls}>Data</h2>
      <div className="mx-auto mt-3 h-[3px] w-10 rounded-full bg-meat/60" />
      <p className="mt-4 text-[14px] font-bold text-ink-soft">現在のMeatup情報🍖</p>

      {/* 開催日まで＝ビールジョッキ（一番上） */}
      <Tile className="mt-6">
        <TileLabel>開催日まで</TileLabel>
        <BeerMug
          pct={beerPct}
          dayOf={dayOf}
          label=""
          sub={dayOf ? '🍻 本日開催！' : daysLeft != null ? `あと ${daysLeft} 日` : ''}
        />
      </Tile>

      {/* 人数＋性別＝統合（ドーナツの中心にカウンター） */}
      <div className="mt-8 flex flex-col items-center">
        <p className="mb-3 text-[12px] font-bold text-ink-soft">参加表明してくれてるひと🙌</p>
        <GenderDonut
          size={196}
          total={total}
          maleN={maleN}
          center={
            <span className="flex items-end gap-0.5">
              <CountUp value={total} className="font-[family-name:var(--font-display)] text-[52px] leading-none text-meat" />
              <span className="pb-1 text-[15px] font-bold text-ink-soft">人</span>
            </span>
          }
        />
        <div className="mt-4 flex items-center justify-center gap-4 text-[13px] font-bold">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-3 w-3 rounded-sm" style={{ background: 'var(--color-meat)' }} />男 {maleN}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-3 w-3 rounded-sm" style={{ background: 'var(--color-meat-light)' }} />女 {femaleN}
          </span>
        </div>
      </div>

      {/* 期待タグ＝水紋ドラム＋連動EQ（背景箱なしでタイルに溶け込ませる） */}
      <Tile className="mt-8">
        <TileLabel>みんなの狙い🔥</TileLabel>
        <div className="-mt-10 flex justify-center">
          <RippleField data={expData} size={300} bare withEq />
        </div>
      </Tile>

      {/* 職業＝ワードクラウド〔タグ〕（少し広めに） */}
      <div className="mt-4 rounded-card border-[2.5px] border-ink bg-paper px-2.5 py-4 text-center shadow-card">
        <TileLabel>どんなひとがくる？</TileLabel>
        <JobTags words={jobWords} />
      </div>
    </section>
  )
}
