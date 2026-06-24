'use client'

// Data セクションの可視化プリミティブ群。3つの方向(案A/B/C)で共有する。
// ほぼ SVG/CSS。アニメは「視界に入ったら1回」(useInView) ＋ reduced-motion 配慮。
// 主役の数字だけ NumberFlow、祝祭は canvas-confetti(動的import)。

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import NumberFlow from '@number-flow/react'
import { GENDER, JOBS, EXPECTATIONS, CUMULATIVE, TOTAL, maleRatio, type Slice } from './data'

// ── hooks ──────────────────────────────────────────────────────────────────

/** 要素が一度視界に入ったら true（演出トリガー）。 */
export function useInView<T extends Element>(threshold = 0.35) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, inView }
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** reduced-motion をリアクティブに。初期は false（SSR と一致）→マウント後に反映。 */
export function useReducedMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduce(m.matches)
    sync()
    m.addEventListener('change', sync)
    return () => m.removeEventListener('change', sync)
  }, [])
  return reduce
}

/** ブランド色の紙吹雪を一発。reduced-motion なら何もしない。 */
export async function fireConfetti() {
  if (prefersReducedMotion()) return
  const confetti = (await import('canvas-confetti')).default
  confetti({
    particleCount: 70,
    spread: 68,
    startVelocity: 42,
    origin: { y: 0.72 },
    colors: ['#b33d44', '#ff6500', '#f4a047', '#ea6d6f', '#fff7ef'],
    scalar: 0.95,
    disableForReducedMotion: true,
  })
}

// ── 串アイコン（肉の語彙の最小単位） ────────────────────────────────────────

/** 縦串。肉2＋ねぎ1。色は currentColor（性別などで塗り分け可能）。 */
export function Skewer({
  className,
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg viewBox="0 0 22 54" className={className} style={style} aria-hidden>
      {/* 串（木） */}
      <line x1="11" y1="3" x2="11" y2="52" stroke="#b07a44" strokeWidth="2.4" strokeLinecap="round" />
      {/* 肉 */}
      <rect x="2.5" y="7" width="17" height="11.5" rx="4" fill="currentColor" stroke="#1d1411" strokeWidth="1.6" />
      {/* ねぎ */}
      <rect x="4" y="21" width="14" height="9" rx="3.5" fill="#9bbf5a" stroke="#1d1411" strokeWidth="1.6" />
      {/* 肉 */}
      <rect x="2.5" y="32.5" width="17" height="11.5" rx="4" fill="currentColor" stroke="#1d1411" strokeWidth="1.6" />
    </svg>
  )
}

/**
 * 串ラック・ロスター（署名）。TOTAL 本の串をグリルに並べる。
 * gendered=true で 男(meat)/女(meat-light) に塗り分け＝1ビジュアルで人数＋男女比。
 */
export function SkewerRoster({ gendered = true }: { gendered?: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)
  const males = GENDER[0].n
  return (
    <div ref={ref}>
      <div className="flex flex-wrap items-end justify-center gap-x-1 gap-y-2">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <span
            key={i}
            className={inView ? 'ds-drop' : 'opacity-0'}
            style={{
              color: gendered && i >= males ? 'var(--color-meat-light)' : 'var(--color-meat)',
              animationDelay: `${i * 55}ms`,
            }}
          >
            <Skewer className="h-[46px] w-[19px]" />
          </span>
        ))}
      </div>
      {/* グリル */}
      <div className="mx-auto mt-1 h-[10px] w-full max-w-[340px] rounded-full bg-ink/85 shadow-[inset_0_2px_0_rgba(255,255,255,0.15)]" />
      <div className="mx-auto h-[3px] w-[88%] max-w-[300px] rounded-full bg-flame/40 blur-[1px]" />
      {gendered && (
        <div className="mt-3 flex justify-center gap-4 text-[12px] font-bold text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <i className="inline-block h-3 w-3 rounded-sm" style={{ background: 'var(--color-meat)' }} />男 {GENDER[0].n}
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="inline-block h-3 w-3 rounded-sm" style={{ background: 'var(--color-meat-light)' }} />女 {GENDER[1].n}
          </span>
        </div>
      )}
    </div>
  )
}

// ── 主役の数字（カウントアップ） ────────────────────────────────────────────

/** 視界に入ると 0→value に転がる数字（NumberFlow。reduced-motion は既定で配慮）。 */
export function CountUp({
  value,
  className,
  confettiOnArrive = false,
}: {
  value: number
  className?: string
  confettiOnArrive?: boolean
}) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.5)
  // NumberFlow はクライアント計測で属性が決まる→ SSR と差が出てハイドレーション
  // 不一致になる。マウント後にだけ描画し、初期描画は素の数字に揃える。
  const [mounted, setMounted] = useState(false)
  const [v, setV] = useState(0)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!inView) return
    setV(value)
    if (confettiOnArrive) {
      const t = setTimeout(fireConfetti, 650)
      return () => clearTimeout(t)
    }
  }, [inView, value, confettiOnArrive])
  return (
    <span ref={ref} className={className}>
      {mounted ? <NumberFlow value={v} /> : 0}
    </span>
  )
}

// ── 男女比ドーナツ（stroke-dasharray） ──────────────────────────────────────

export function GenderDonut({
  size = 132,
  total = TOTAL,
  maleN = GENDER[0].n,
  center,
}: {
  size?: number
  total?: number
  maleN?: number
  center?: ReactNode
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.5)
  const r = 52
  const c = 2 * Math.PI * r
  const maleLen = c * (total > 0 ? maleN / total : maleRatio)
  return (
    <div ref={ref} className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--color-meat-light)" strokeWidth="16" />
        <circle
          cx="66" cy="66" r={r} fill="none"
          stroke="var(--color-meat)" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${maleLen} ${c}`}
          className="ds-arc"
          style={{ strokeDashoffset: inView ? 0 : maleLen }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {center ?? (
          <>
            <span className="font-[family-name:var(--font-display)] text-[26px] leading-none text-ink">{total}</span>
            <span className="text-[11px] font-bold text-ink-soft">人</span>
          </>
        )}
      </div>
    </div>
  )
}

// ── 職業：伸びるバー ────────────────────────────────────────────────────────

export function JobBars() {
  const { ref, inView } = useInView<HTMLUListElement>(0.4)
  const max = Math.max(...JOBS.map((j) => j.n))
  return (
    <ul ref={ref} className="grid gap-2.5">
      {JOBS.map((j, i) => (
        <li key={j.key} className="flex items-center gap-2 text-[13px]">
          <span className="w-[112px] shrink-0 text-left font-bold text-ink">
            <span className="mr-1">{j.emoji}</span>
            {j.label}
          </span>
          <span className="relative h-[18px] flex-1 overflow-hidden rounded-pill bg-line/60">
            <span
              className="ds-bar absolute inset-y-0 left-0 rounded-pill"
              style={{
                width: inView ? `${(j.n / max) * 100}%` : '0%',
                background: 'linear-gradient(90deg,var(--color-grill),var(--color-meat))',
                transitionDelay: `${i * 90}ms`,
              }}
            />
          </span>
          <span className="w-5 shrink-0 text-right font-bold tabular-nums text-ink-soft">{j.n}</span>
        </li>
      ))}
    </ul>
  )
}

// ── 期待タグ：ステッカー ────────────────────────────────────────────────────

const ROT = ['-3deg', '2deg', '-1.5deg', '3deg']

export function ExpectationStickers({ brutal = false }: { brutal?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {EXPECTATIONS.map((e, i) => (
        <span
          key={e.key}
          className="inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[14px] font-bold"
          style={{
            background: i === 0 ? 'var(--color-meat)' : 'var(--color-paper)',
            color: i === 0 ? '#fff' : 'var(--color-ink)',
            border: '2.5px solid var(--color-ink)',
            transform: `rotate(${ROT[i % ROT.length]})`,
            boxShadow: brutal ? '4px 4px 0 var(--color-ink)' : 'var(--shadow-card)',
          }}
        >
          <span className="text-[16px]">{e.emoji}</span>
          {e.label}
          <span className="tabular-nums opacity-70">{e.n}</span>
        </span>
      ))}
    </div>
  )
}

// ── 焼け具合メーター（勢い） ────────────────────────────────────────────────

/** 盛り上がり度。直近の累計から playful に算出（=21 → ほぼ焼き上がり）。 */
export function DonenessMeter() {
  const { ref, inView } = useInView<HTMLDivElement>(0.5)
  const pct = Math.min(1, TOTAL / 24) // 24人想定のゆるい満タン
  const stages = ['レア', 'ミディアム', 'よく焼き', '焼き上がり！']
  const stage = pct > 0.85 ? 3 : pct > 0.6 ? 2 : pct > 0.3 ? 1 : 0
  return (
    <div ref={ref} className="w-full">
      <div className="relative h-[22px] w-full overflow-hidden rounded-pill border-[2.5px] border-ink bg-paper">
        <div
          className="ds-bar ds-shimmer h-full rounded-pill"
          style={{
            width: inView ? `${pct * 100}%` : '0%',
            background: 'linear-gradient(90deg,#ea6d6f,#dc7c34,#ff6500)',
          }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-bold text-ink-soft">
        {stages.map((s, i) => (
          <span key={s} style={{ color: i === stage ? 'var(--color-flame)' : undefined }}>
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── 登録推移：スパークライン（累計） ────────────────────────────────────────

export function MomentumSparkline({ w = 240, h = 64 }: { w?: number; h?: number }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.5)
  const max = CUMULATIVE[CUMULATIVE.length - 1]
  const pts = CUMULATIVE.map((v, i) => {
    const x = (i / (CUMULATIVE.length - 1)) * (w - 8) + 4
    const y = h - 6 - (v / max) * (h - 14)
    return [x, y] as const
  })
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${d} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`
  return (
    <div ref={ref} className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-hidden>
        <path d={area} fill="var(--color-meat)" opacity={0.1} />
        <path
          d={d}
          fill="none"
          stroke="var(--color-meat)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ds-line"
          style={{ strokeDasharray: 600, strokeDashoffset: inView ? 0 : 600 }}
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4.5 : 3} fill="var(--color-meat)" />
        ))}
      </svg>
    </div>
  )
}

// ── 小物 ────────────────────────────────────────────────────────────────────

export function Stat({ value, label, sub }: { value: ReactNode; label: string; sub?: string }) {
  return (
    <div className="text-center">
      <div className="font-[family-name:var(--font-display)] text-[40px] leading-none text-ink">{value}</div>
      <div className="mt-1 text-[13px] font-bold text-ink">{label}</div>
      {sub && <div className="text-[11px] text-ink-soft">{sub}</div>}
    </div>
  )
}

/** モノスペースの極小ラベル（“技術的味付け”） */
export function MicroLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-soft/70">{children}</span>
  )
}

export type { Slice }
