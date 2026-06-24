'use client'

// テーマ別の“感じ”を出す表現バリエーション。
// 🍺ビール感 / 🎧遊び感 / 🤝繋がり感 ＋ 職業ワードクラウド（自由入力込み）。
// いずれも SVG/CSS のみ。アニメは reduced-motion で停止（globals.css の ds-*）。

import { EXPECTATIONS, EXP_COLORS, JOB_WORDS, GENDER, TOTAL } from './data'
import { useInView, useReducedMotion } from './widgets'

// ── 🍺 ビール感：ジョッキが満ちる ───────────────────────────────────────────

/** 参加の盛り上がりを「ビールが注がれて泡立つ」で。pct=満タン比。 */
export function BeerMug({
  pct = 0.8,
  label = '盛り上がり',
  sub = 'かんぱい寸前！',
}: {
  pct?: number
  label?: string
  sub?: string
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.5)
  return (
    <div ref={ref} className="flex flex-col items-center">
      <div className="relative h-[124px] w-[86px]">
        {/* ジョッキ */}
        <div className="absolute inset-0 overflow-hidden rounded-b-[16px] rounded-t-[8px] border-[3px] border-ink bg-transparent">
          {/* ビール */}
          <div
            className="ds-bar absolute inset-x-0 bottom-0"
            style={{
              height: inView ? `${pct * 100}%` : '0%',
              background: 'linear-gradient(180deg,#ffcf5e,#f4a047 55%,#dc7c34)',
            }}
          >
            {/* 気泡（中身を流れる泡。空に近い時は出さない） */}
            {pct > 0.12 &&
              [12, 40, 64].map((x, i) => (
                <span
                  key={x}
                  className="ds-bubble absolute bottom-2 h-1.5 w-1.5 rounded-full bg-white/70"
                  style={{ left: `${x}%`, animationDelay: `${i * 0.6}s` }}
                />
              ))}
            {/* 泡ヘッド：液面に乗る“控えめな頭”。グラスの overflow-hidden で内幅にクリップ
                ＝中段でも横にはみ出さない。0%付近は出さない。 */}
            {pct > 0.05 && (
              <div
                className="pointer-events-none absolute inset-x-0 top-0"
                style={{ filter: 'drop-shadow(0 1px 1px rgba(126,0,29,0.18))' }}
              >
                {/* 液面のすぐ上の白帯（連結ベース） */}
                <div
                  className="absolute inset-x-0 rounded-t-[5px] bg-white"
                  style={{ top: -(5 + pct * 4), height: 10 + pct * 4 }}
                />
                {/* ゆるい凸（控えめ・グラス内に収まる） */}
                {[26, 50, 74].map((l, i) => {
                  const s = (i === 1 ? 16 : 12) + Math.round(pct * 6)
                  return (
                    <span
                      key={l}
                      className="absolute -translate-x-1/2 rounded-full bg-white"
                      style={{ left: `${l}%`, top: -(7 + pct * 7), width: s, height: s }}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>
        {/* 満タン付近だけ：リムから少し溢れる泡＋たれ（グラス外＝クリップされない）。
            ov は 88%→100% で 0→1。これより下では一切溢れない＝“満タンの事件”にする。 */}
        {inView && pct > 0.88 && (
          <>
            {/* 溢れる小さな泡頭（リム上） */}
            <div
              className="pointer-events-none absolute left-1/2 -translate-x-1/2"
              style={{ top: 0, filter: 'drop-shadow(0 1px 1px rgba(126,0,29,0.18))' }}
            >
              {[-22, 0, 22].map((dx, i) => {
                const ov = (pct - 0.88) / 0.12
                const s = (i === 1 ? 18 : 13) + Math.round(ov * 8)
                return (
                  <span
                    key={i}
                    className="absolute -translate-x-1/2 rounded-full bg-white"
                    style={{ left: dx, top: -Math.round(s * 0.5 + ov * 4), width: s, height: s }}
                  />
                )
              })}
            </div>
            {/* たれ（両サイドから少し） */}
            <span
              className="pointer-events-none absolute rounded-b-full bg-white"
              style={{
                left: 11,
                top: 2,
                width: 7,
                height: 9 + Math.round(((pct - 0.88) / 0.12) * 13),
                filter: 'drop-shadow(0 1px 1px rgba(126,0,29,0.16))',
              }}
            />
            <span
              className="pointer-events-none absolute rounded-b-full bg-white"
              style={{
                right: 14,
                top: 4,
                width: 6,
                height: 7 + Math.round(((pct - 0.88) / 0.12) * 10),
                filter: 'drop-shadow(0 1px 1px rgba(126,0,29,0.16))',
              }}
            />
          </>
        )}
        {/* 取っ手 */}
        <div className="absolute right-[-15px] top-6 h-[46px] w-[22px] rounded-r-[14px] border-[3px] border-l-0 border-ink" />
      </div>
      {label && <p className="mt-3 text-[13px] font-bold text-ink">🍺 {label}</p>}
      <p className={(label ? '' : 'mt-3 ') + 'text-[11px] text-ink-soft'}>{sub}</p>
    </div>
  )
}

// ── 🎧 遊び感：イコライザー ─────────────────────────────────────────────────

/** “音が鳴ってる”ノリ。バーが上下するEQ。遊び/音楽の熱量を賑やかしで。 */
export function Equalizer({ bars = 11 }: { bars?: number }) {
  // 高さ・速さは決め打ちの種で散らす（Math.random は静的書き出しで使えない）
  const seed = [0.5, 0.9, 0.35, 0.7, 1, 0.45, 0.8, 0.3, 0.65, 0.95, 0.5]
  return (
    <div className="flex h-[72px] items-end justify-center gap-[5px]">
      {Array.from({ length: bars }).map((_, i) => {
        const base = seed[i % seed.length]
        return (
          <span
            key={i}
            className="ds-eq w-[7px] rounded-full"
            style={{
              height: `${20 + base * 50}%`,
              background: 'linear-gradient(180deg,#ff6500,#f4a047)',
              animationDuration: `${0.7 + (i % 4) * 0.18}s`,
              animationDelay: `${(i % 5) * 0.12}s`,
            }}
          />
        )
      })}
    </div>
  )
}

/**
 * 円形の音波形EQ：期待タグ4種を放射状バーで。基準の長さ＝件数、そこへ常時ゆらぎ。
 * 「厳密値より動きの楽しさ」を体現。技術＝放射状に並べた div を rotate＋scaleY。
 */
export function CircularEq({ size = 220 }: { size?: number }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4)
  const c = size / 2
  const innerR = Math.round(size * 0.2)
  const maxLen = Math.round(size * 0.22)
  const max = Math.max(...EXPECTATIONS.map((e) => e.n))
  const colors = EXPECTATIONS.map((e) => EXP_COLORS[e.key])
  const N = 48
  const per = N / EXPECTATIONS.length
  return (
    <div ref={ref} className="relative mx-auto" style={{ width: size, height: size }}>
      {/* 放射状バー */}
      <div className="absolute left-1/2 top-1/2">
        {Array.from({ length: N }).map((_, i) => {
          const g = Math.floor(i / per)
          const len = Math.max(8, Math.round((EXPECTATIONS[g].n / max) * maxLen))
          return (
            <span key={i} className="absolute left-0 top-0 block" style={{ transform: `rotate(${(i / N) * 360}deg)` }}>
              <span
                className={inView ? 'ds-eq block' : 'block'}
                style={{
                  position: 'absolute',
                  left: -2,
                  top: innerR,
                  width: 4,
                  height: len,
                  borderRadius: 999,
                  background: colors[g % colors.length],
                  transformOrigin: 'center top',
                  animationDuration: `${0.7 + (i % 5) * 0.13}s`,
                  animationDelay: `${(i % 7) * 0.08}s`,
                }}
              />
            </span>
          )
        })}
      </div>
      {/* 中央ハブ */}
      <div
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink bg-paper text-[18px]"
        style={{ width: innerR * 1.4, height: innerR * 1.4 }}
      >
        🔊
      </div>
      {/* 各アーク中央に絵文字＋件数 */}
      {EXPECTATIONS.map((e, g) => {
        const a = (((g * per + per / 2) / N) * 360 * Math.PI) / 180
        const R = innerR + maxLen + 14
        const x = Math.round(c - R * Math.sin(a))
        const y = Math.round(c + R * Math.cos(a))
        return (
          <div key={e.key} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: x, top: y }}>
            <div className="text-[16px] leading-none">{e.emoji}</div>
            <div className="text-[10px] font-bold text-ink-soft">{e.label} {e.n}</div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * 同心円の波形が重なる版：期待タグ4種それぞれが「波打つ円」になり、件数で半径が変わって
 * 入れ子に重なる。各リングは別速度/向きで回転し、波が干渉して見える。
 * 技術＝SVGの波形パス（r=base+amp·sin(waves·θ)）を CSS で回転。
 */
export function ConcentricWaves({ size = 244 }: { size?: number }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4)
  const c = size / 2
  const max = Math.max(...EXPECTATIONS.map((e) => e.n))
  const minR = size * 0.13
  const maxR = size * 0.42
  // キーごとに固定色＆波数（干渉のため各リングで lobe 数を変える）
  const style: Record<string, { color: string; waves: number; dur: number; rev: boolean }> = {
    meat: { color: EXP_COLORS.meat, waves: 11, dur: 16, rev: false },
    drink: { color: EXP_COLORS.drink, waves: 9, dur: 13, rev: true },
    play: { color: EXP_COLORS.play, waves: 7, dur: 19, rev: false },
    connect: { color: EXP_COLORS.connect, waves: 6, dur: 22, rev: true },
  }
  // 件数で半径（多い＝外側の大きい円）。整数に丸めて SSR と一致させる。
  const wavePath = (baseR: number, amp: number, waves: number) => {
    const pts = 96
    const seg: string[] = []
    for (let i = 0; i < pts; i++) {
      const t = (i / pts) * Math.PI * 2
      const r = baseR + amp * Math.sin(waves * t)
      seg.push(`${Math.round(c + r * Math.cos(t))},${Math.round(c + r * Math.sin(t))}`)
    }
    return 'M' + seg.join(' L') + ' Z'
  }
  return (
    <div ref={ref} className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" aria-hidden>
        {EXPECTATIONS.map((e) => {
          const s = style[e.key]
          const baseR = Math.round(minR + (e.n / max) * (maxR - minR))
          const amp = Math.round(5 + (e.n / max) * 9)
          return (
            <path
              key={e.key}
              d={wavePath(baseR, amp, s.waves)}
              fill={s.color}
              fillOpacity={0.1}
              stroke={s.color}
              strokeWidth={2.4}
              strokeOpacity={0.85}
              className={inView ? (s.rev ? 'ds-spin-rev' : 'ds-spin') : undefined}
              style={{ animationDuration: `${s.dur}s` }}
            />
          )
        })}
      </svg>
      {/* 絵文字＋件数を4方向(上/右/下/左)に散らして重なりを避ける（回転しない） */}
      {EXPECTATIONS.map((e, i) => {
        const baseR = minR + (e.n / max) * (maxR - minR)
        const ang = (-90 + i * 90) * (Math.PI / 180)
        const x = Math.round(c + baseR * Math.cos(ang))
        const y = Math.round(c + baseR * Math.sin(ang))
        return (
          <div
            key={e.key}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-pill border border-line bg-paper/90 px-1.5 text-center text-[12px] font-bold leading-tight"
            style={{ left: x, top: y }}
          >
            {e.emoji} <span className="text-ink-soft">{e.n}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * 水紋＝4つの太鼓。期待タグ4種それぞれが「叩かれる太鼓」になり、絵文字(＝太鼓)が拍で
 * “ドン”と跳ね、そこから波紋が広がって重なる。件数が大きいほど波が強い（太い/速い/本数多い
 * /大きい）。DAWのドラム可視化のイメージ。
 * 技術＝CSS keyframes（中心を scale 拍動＝ds-thump、border円を scale＋fade＝ds-ripple）。
 */
export function RippleField({
  size = 264,
  withEq = false,
  bare = false,
  data = EXPECTATIONS,
}: {
  size?: number
  withEq?: boolean
  bare?: boolean // 自前の背景箱を消して親タイルに溶け込ませる
  data?: { key: string; label: string; n: number; emoji?: string }[]
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4)
  const reduce = useReducedMotion()
  const fieldAnim = inView && !reduce
  const max = Math.max(1, ...data.map((e) => e.n))
  const conf: Record<string, { color: string; pos: [number, number] }> = {
    meat: { color: EXP_COLORS.meat, pos: [39, 41] },
    connect: { color: EXP_COLORS.connect, pos: [66, 31] },
    drink: { color: EXP_COLORS.drink, pos: [32, 68] },
    play: { color: EXP_COLORS.play, pos: [70, 65] },
  }
  // 背景EQ：4等分（タグごとの色グループ）。各バーの高さ＝そのタグの強さ t（＝件数連動）。
  // eqWig はグループ内の“EQらしい凸凹”の形だけ（振幅は t が決めるので集計に追従）。
  const eqWig = [0.72, 1, 0.84, 0.62]
  return (
    <div
      ref={ref}
      className={'relative mx-auto overflow-hidden ' + (bare ? '' : 'rounded-[12px]')}
      style={{
        width: size,
        height: size,
        background: bare ? 'transparent' : 'radial-gradient(120% 120% at 50% 30%, #fffdfa, #fdeede)',
      }}
    >
      {/* 背景の装飾EQ（音のノリ）。波紋/太鼓の後ろに薄く敷く */}
      {withEq && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center gap-[5px] px-3 opacity-30"
          aria-hidden
        >
          {data.map((e) => {
            const color = EXP_COLORS[e.key]
            const tt = e.n / max
            const base = 14 + tt * 50 // 高さの振幅＝そのタグの強さ（集計連動）
            const beat = +(2.9 - tt * 0.8).toFixed(2) // 対応する太鼓と同じ周期＝“上乗せ”だけ同期
            return eqWig.map((w, k) => (
              // 外＝ふだんのゆらゆら（非同期）、内＝波が出た瞬間だけ上乗せ（拍に同期）
              <span
                key={e.key + k}
                className={(fieldAnim ? 'ds-eq-idle ' : '') + 'block w-[6px]'}
                style={{
                  height: `${Math.round(base * w)}px`,
                  marginLeft: k === 0 ? 7 : undefined, // グループ間を少し空ける
                  transformOrigin: 'bottom',
                  animationDuration: `${(0.9 + (k % 4) * 0.14).toFixed(2)}s`,
                  animationDelay: `${(k * 0.13).toFixed(2)}s`,
                }}
              >
                <span
                  className={(fieldAnim ? 'ds-eq-kick ' : '') + 'block h-full w-full rounded-full'}
                  style={{
                    background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 25%, white))`,
                    transformOrigin: 'bottom',
                    animationDuration: `${beat}s`,
                    animationDelay: `${(k * 0.03).toFixed(2)}s`,
                  }}
                />
              </span>
            ))
          })}
        </div>
      )}
      {data.map((e) => {
        const { color, pos } = conf[e.key]
        const t = e.n / max // 強さ 0..1
        const reach = Math.round(58 + t * 92) // 強いほど大きく広がる
        const dur = +(2.9 - t * 0.8).toFixed(2) // 心拍の周期。強い＝少し速い（ドキドキ）
        const sw = +(1.4 + t * 2).toFixed(1) // 強いほど太い
        const rings = 2 // lub-dub の2連だけ。本数を絞って背景を静かに
        const drum = Math.round(28 + t * 24) // 太鼓（中心）の大きさ
        const animate = inView && !reduce
        return (
          <div key={e.key} className="absolute" style={{ left: `${pos[0]}%`, top: `${pos[1]}%` }}>
            {/* 波紋リング */}
            {Array.from({ length: rings }).map((_, i) => {
              const frac = (i + 1) / rings
              const d = Math.round(reach * (animate ? 1 : frac))
              return (
                <span
                  key={i}
                  className={animate ? 'ds-heart-ripple absolute rounded-full' : 'absolute rounded-full'}
                  style={{
                    left: 0,
                    top: 0,
                    width: d,
                    height: d,
                    marginLeft: -d / 2,
                    marginTop: -d / 2,
                    border: `${sw}px solid ${color}`,
                    opacity: animate ? undefined : 0.3,
                    animationDuration: `${dur}s`,
                    // lub→dub の2連（dub だけ少し遅らせる）。その後は長い休符。
                    animationDelay: `${(i * dur * 0.16).toFixed(2)}s`,
                  }}
                />
              )
            })}
            {/* 太鼓＝絵文字（拍で跳ねる）。波紋と同じ margin 方式で中心を一致させる */}
            <span
              className={(animate ? 'ds-heart-thump ' : '') + 'absolute flex items-center justify-center rounded-full'}
              style={{
                left: 0,
                top: 0,
                width: drum,
                height: drum,
                marginLeft: -drum / 2,
                marginTop: -drum / 2,
                background: 'var(--color-paper)',
                border: `2.5px solid ${color}`,
                boxShadow: '0 2px 5px rgba(126,0,29,0.12)',
                animationDuration: `${dur}s`,
              }}
            >
              <span style={{ fontSize: `${Math.round(15 + t * 9)}px`, lineHeight: 1 }}>{e.emoji}</span>
            </span>
            <span
              className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-ink-soft"
              style={{ left: 0, top: drum / 2 + 3 }}
            >
              {e.label} {e.n}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** EQ を“データ”として使う版：期待タグ4本を音量バーで。 */
export function ExpectationEq() {
  const max = Math.max(...EXPECTATIONS.map((e) => e.n))
  return (
    <div className="flex items-end justify-center gap-4">
      {EXPECTATIONS.map((e, col) => (
        <div key={e.key} className="flex flex-col items-center gap-1">
          <div className="flex h-[88px] items-end gap-[3px]">
            {[0, 1].map((b) => (
              <span
                key={b}
                className="ds-eq w-[9px] rounded-full"
                style={{
                  height: `${(e.n / max) * 100}%`,
                  background: 'linear-gradient(180deg,#ff6500,#b33d44)',
                  animationDuration: `${0.8 + col * 0.15 + b * 0.1}s`,
                  animationDelay: `${col * 0.1 + b * 0.2}s`,
                }}
              />
            ))}
          </div>
          <span className="text-[15px]">{e.emoji}</span>
          <span className="text-[10px] font-bold text-ink-soft">{e.label} {e.n}</span>
        </div>
      ))}
    </div>
  )
}

// ── 🤝 繋がり感：コンステレーション ─────────────────────────────────────────

/** 参加者をノード、交わりをラインで。“繋がる場”の雰囲気（装飾）。男女で色分け。 */
export function Constellation({ w = 320, h = 200 }: { w?: number; h?: number }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4)
  const males = GENDER[0].n
  // 決め打ちの擬似乱数で散らす（sinベース・毎回同じ配置）
  const rnd = (i: number, s: number) => {
    const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453
    return v - Math.floor(v)
  }
  // 整数に丸める：Math.sin の生値は Node とブラウザで極小差が出てハイドレーション
  // 不一致になる。丸めれば両者で同一文字列になり一致する。
  const nodes = Array.from({ length: TOTAL }).map((_, i) => ({
    x: Math.round(18 + rnd(i, 1) * (w - 36)),
    y: Math.round(16 + rnd(i, 2) * (h - 32)),
    male: i < males,
  }))
  // 近いノード同士を結ぶ（距離しきい値）
  const links: [number, number][] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)
      if (d < 78) links.push([i, j])
    }
  }
  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-hidden>
        {links.map(([a, b], k) => (
          <line
            key={k}
            x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
            stroke="var(--color-meat)" strokeWidth="1"
            style={{ opacity: inView ? 0.28 : 0, transition: `opacity 0.6s ${k * 18}ms` }}
          />
        ))}
        {nodes.map((n, i) => (
          <circle
            key={i}
            cx={n.x} cy={n.y} r={inView ? 5 : 0}
            fill={n.male ? 'var(--color-meat)' : 'var(--color-meat-light)'}
            stroke="#fff" strokeWidth="1.5"
            className="ds-twinkle"
            style={{ transition: `r 0.4s ${i * 45}ms cubic-bezier(0.2,0.7,0.2,1)`, animationDelay: `${(i % 6) * 0.4}s` }}
          />
        ))}
      </svg>
      <p className="mt-1 text-center text-[11px] text-ink-soft">🤝 {TOTAL}人が交わる</p>
    </div>
  )
}

// ── 職業ワードクラウド（自由入力込み） ──────────────────────────────────────

const WC_COLORS = [
  'var(--color-meat)',
  'var(--color-grill)',
  'var(--color-flame)',
  'var(--color-gold)',
  'var(--color-ink)',
  'var(--color-meat-light)',
]

const wcMax = Math.max(...JOB_WORDS.map((j) => j.w))

// 大きい語が中央寄りになるよう、重み降順で中央→外側に並べ替え
const wcCentered = [...JOB_WORDS]
  .sort((a, b) => b.w - a.w)
  .reduce<{ word: string; w: number }[]>((acc, item, i) => {
    if (i % 2 === 0) acc.push(item)
    else acc.unshift(item)
    return acc
  }, [])

/** ①雲：職業を頻度サイズのタグ雲で。自由入力(その他)も1語として浮かぶ。 */
export function JobWordCloud() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-2 py-1">
      {wcCentered.map((j, i) => {
        const t = j.w / wcMax
        const size = 13 + Math.round(Math.sqrt(t) * 26)
        return (
          <span
            key={j.word}
            className="font-bold leading-tight"
            style={{
              fontSize: `${size}px`,
              color: WC_COLORS[i % WC_COLORS.length],
              transform: `rotate(${(i % 2 ? -1 : 1) * (i % 3)}deg)`,
              opacity: 0.55 + t * 0.45,
            }}
          >
            {j.word}
          </span>
        )
      })}
    </div>
  )
}

// 上位3位の背景色（1位＝肉赤、2位＝グリル、3位＝ゴールド）。4位以降は枠線のみ。
const TAG_TOP_COLORS = ['var(--color-meat)', 'var(--color-grill)', 'var(--color-gold)']

/** ②タグ：チップ型。上位3位に背景色＋件数で“タグ”らしく。words 未指定はスナップショット。 */
export function JobTags({ words = JOB_WORDS }: { words?: { word: string; w: number }[] }) {
  const max = Math.max(1, ...words.map((j) => j.w))
  // 件数降順で順位を決める（背景色は順位、サイズは件数）
  const ranked = [...words].sort((a, b) => b.w - a.w)
  const centered = ranked.reduce<{ word: string; w: number; rank: number }[]>((acc, item, i) => {
    const entry = { ...item, rank: i }
    if (i % 2 === 0) acc.push(entry)
    else acc.unshift(entry)
    return acc
  }, [])
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
      {centered.map((j) => {
        const t = j.w / max
        const top = j.rank < 3
        const fill = top ? TAG_TOP_COLORS[j.rank] : 'var(--color-paper)'
        return (
          <span
            key={j.word}
            className="inline-flex items-center gap-1 rounded-pill border-2 border-ink font-bold leading-none"
            style={{
              fontSize: `${12 + Math.round(t * 5)}px`,
              padding: `${5 + Math.round(t * 4)}px ${10 + Math.round(t * 6)}px`,
              background: fill,
              color: top ? '#fff' : 'var(--color-ink)',
            }}
          >
            <span className="opacity-50">#</span>
            {j.word}
            <span className={'tabular-nums ' + (top ? 'text-white/70' : 'text-ink-soft')}>{j.w}</span>
          </span>
        )
      })}
    </div>
  )
}

/** ③グリル：BBQの網の上に職業が肉として乗ってる。重みで肉の大きさが変わる。 */
export function JobGrill() {
  return (
    <div className="relative overflow-hidden rounded-[12px] border-[3px] border-ink" style={{ background: '#2a201c' }}>
      {/* 網（横棒） */}
      <div
        className="absolute inset-0"
        aria-hidden
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,#46342b 0 2px,transparent 2px 15px)' }}
      />
      {/* 熾火の照り返し */}
      <div
        className="ds-ember absolute inset-x-0 bottom-0 h-1/2"
        aria-hidden
        style={{ filter: 'blur(8px)' }}
      />
      {/* 肉＝職業 */}
      <div className="relative flex flex-wrap items-center justify-center gap-2.5 p-4">
        {wcCentered.map((j, i) => {
          const t = j.w / wcMax
          return (
            <span
              key={j.word}
              className="inline-flex items-center gap-1 font-bold leading-none text-white"
              style={{
                fontSize: `${12 + Math.round(t * 6)}px`,
                padding: `${6 + Math.round(t * 5)}px ${11 + Math.round(t * 7)}px`,
                borderRadius: '9px',
                background: 'linear-gradient(180deg,#c14b50,#7e2b33)',
                border: '2px solid #140d0b',
                boxShadow: '0 2px 0 #140d0b, inset 0 1px 0 rgba(255,255,255,0.18)',
                transform: `rotate(${(i % 2 ? -1 : 1) * (i % 3)}deg)`,
              }}
            >
              🍖 {j.word}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** ④シンプル：中黒区切りの素直な一行型。控えめで読みやすい。 */
export function JobWordsSimple() {
  const ordered = [...JOB_WORDS].sort((a, b) => b.w - a.w)
  return (
    <p className="text-center leading-relaxed">
      {ordered.map((j, i) => (
        <span key={j.word}>
          {i > 0 && <span className="mx-1.5 text-line">·</span>}
          <span className="text-[14px] font-bold text-ink">{j.word}</span>
          <span className="ml-0.5 align-super text-[10px] text-ink-soft">{j.w}</span>
        </span>
      ))}
    </p>
  )
}
