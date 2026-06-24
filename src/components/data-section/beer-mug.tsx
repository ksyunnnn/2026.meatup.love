'use client'

// 参加の盛り上がり＝注がれて満ちるビールジョッキ（シズル線画・Canvas）。
// /preview の候補比較で採用された「A シズル線画 · Canvas」をトリム移植したもの。
// 充填率 pct は 0..1.2：1.0=満タン(100%)、>1=あふれ(120%)。0..1 は時間経過で満ちる。
// あふれ＝「縁から」（右の縁を盛り、その角から壁をなぞって下まで垂れる静止の泡）。
// 当日(dayOf)はトップ hero のお肉(bounce-oniku)と同じ animate.css jiggle でジョッキごと揺らす。
// ※泡そのものは動かさない（86px で泡を動かすと不自然＝静止が正解）。動くのは「昇る気泡」と当日の揺れだけ。
import { useEffect, useRef } from 'react'

const LINE = '#3a2a1e'
const FOAM = '#fbf6ea'

// ジョッキのジオメトリ（ネイティブ 120×150。scale 1.3 で本番グラス幅≈86px）。
const A = { GL: 28, GR: 92, GT: 38, GB: 134, cx: 60 }
const A_W = A.GR - A.GL
const SCALE = 1.3

// 泡の雲（baseline からの相対。dy<0 が上）。大小バラバラ＝機械的にしない。
type Circ = { dx: number; dy: number; r: number }
const FOAM_CLOUD: Circ[] = [
  { dx: -25, dy: -5, r: 9 },
  { dx: -13, dy: -11, r: 11 },
  { dx: 0, dy: -14, r: 12.5 },
  { dx: 13, dy: -11, r: 11 },
  { dx: 25, dy: -5, r: 9 },
  { dx: -7, dy: -2, r: 9 },
  { dx: 9, dy: -2, r: 9 },
]
// 結露の水滴（グラス前面・上ほど密）。x,y,r。
const DROPS = [
  { x: 40, y: 64, r: 2.4 },
  { x: 50, y: 58, r: 1.6 },
  { x: 78, y: 62, r: 2.1 },
  { x: 84, y: 76, r: 1.5 },
  { x: 37, y: 86, r: 1.9 },
  { x: 70, y: 92, r: 1.4 },
  { x: 86, y: 100, r: 1.8 },
  { x: 45, y: 110, r: 1.3 },
]
// 昇る気泡の筋（x, 半径, 周期, 遅延）。
const BUBBLES = [
  { x: 44, r: 1.8, dur: 2.2, delay: 0 },
  { x: 60, r: 2.3, dur: 2.8, delay: 0.5 },
  { x: 60, r: 1.5, dur: 2.4, delay: 1.4 },
  { x: 76, r: 1.7, dur: 2.6, delay: 0.9 },
]
const DIMPLES = [44, 60, 76] // 面取りの縦線

function surfA(pct: number) {
  return A.GB - pct * (A.GB - A.GT)
}
// 泡は充填率で縮小（低充填＝薄い泡、満タン＝盛る）。
function foamK(pct: number) {
  return Math.min(1, 0.5 + pct * 0.55)
}

const round2 = (n: number) => Math.round(n * 100) / 100
// 太く→先細りの“ひと筋の流れ”（縦に重なる円・先は丸い）。x,top から len ぶん下へ。
function pushRun(c: [number, number, number][], x: number, top: number, len: number, r0: number, seed: number) {
  let cy = top
  let rr = r0
  let j = 0
  while (cy < top + len) {
    c.push([round2(x + Math.sin(seed + j * 0.7) * 1.6), round2(cy), round2(Math.max(3.5, rr))])
    cy += rr * 0.9
    rr -= 0.45
    j++
  }
}
// 縁の角からスタートして“右壁をなぞって”流れ落ちる垂れ（下へ行くほど壁側へ寄る）。
function pushRunEdge(c: [number, number, number][], x: number, top: number, len: number, r0: number) {
  let cy = top
  let rr = r0
  while (cy < top + len) {
    const drift = Math.min(5, (cy - top) * 0.06) // 下にいくほど少し右（壁側）へ
    c.push([round2(x + drift + Math.sin(cy * 0.13) * 1.0), round2(cy), round2(Math.max(4, rr))])
    cy += Math.max(4, rr) * 0.85
    rr -= 0.85
  }
}
// あふれ(縁から)＝右の縁を盛り、その角から右壁をなぞって下まで垂らす（120% の泡）。
function overflowFoamEdge(): [number, number, number][] {
  const c: [number, number, number][] = []
  const dome: [number, number, number][] = [
    [-29, 4, 13],
    [-14, -12, 15.5],
    [0, -10, 14.5],
    [14, -5, 13.5],
    [26, 1, 12], // 右の縁を盛る（ここから垂れが続く）
    [-10, -20, 9.5],
    [10, -17, 9],
  ]
  for (const [dx, dy, r] of dome) c.push([A.cx + dx, A.GT + dy, r])
  pushRunEdge(c, A.cx + 25, A.GT + 5, 74, 8.5) // 主役：右の縁から壁をなぞって下まで
  pushRun(c, A.cx + 1, A.GT + 9, 13, 7, 5) // 脇：中央に短い垂れ
  pushRun(c, A.cx - 21, A.GT + 7, 6, 6, 4) // 左の小さなリップ
  return c
}

/** ビールジョッキ Canvas（120×150 をネイティブで描き、外側で scale）。 */
function BeerCanvas({ pct, dayOf }: { pct: number; dayOf: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    cv.width = 120 * dpr
    cv.height = 150 * dpr
    ctx.scale(dpr, dpr)
    const fill = Math.min(1, pct) // 液面は 100% まで（あふれは冠で表現）
    const full = pct >= 0.95 // 満タン＝溢れの冠を出す
    const sy = surfA(fill)
    let raf = 0
    let t0 = 0
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r)
      ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r)
      ctx.arcTo(x, y, x + w, y, r)
      ctx.closePath()
    }
    const glassPath = () => {
      ctx.beginPath()
      ctx.moveTo(A.GL, A.GT + 5)
      ctx.quadraticCurveTo(A.GL, A.GT, A.GL + 5, A.GT)
      ctx.lineTo(A.GR - 5, A.GT)
      ctx.quadraticCurveTo(A.GR, A.GT, A.GR, A.GT + 5)
      ctx.lineTo(A.GR, A.GB - 14)
      ctx.quadraticCurveTo(A.GR, A.GB, A.GR - 14, A.GB)
      ctx.lineTo(A.GL + 14, A.GB)
      ctx.quadraticCurveTo(A.GL, A.GB, A.GL, A.GB - 14)
      ctx.closePath()
    }
    // 雲泡（outline=true で暗い大円(背)＋白円(前)の union 輪郭）。
    const cloud = (cx: number, baseY: number, k: number, outline = true) => {
      if (outline) {
        ctx.fillStyle = LINE
        for (const c of FOAM_CLOUD) {
          ctx.beginPath()
          ctx.arc(cx + c.dx * k, baseY + c.dy * k, c.r * k + 1.4, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.fillStyle = FOAM
      for (const c of FOAM_CLOUD) {
        ctx.beginPath()
        ctx.arc(cx + c.dx * k, baseY + c.dy * k, c.r * k, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    const drawFoamCircles = (cs: [number, number, number][]) => {
      ctx.fillStyle = LINE
      for (const [x, y, r] of cs) {
        ctx.beginPath()
        ctx.arc(x, y, r + 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = FOAM
      for (const [x, y, r] of cs) {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const draw = (ts: number) => {
      if (!t0) t0 = ts
      const el = (ts - t0) / 1000
      ctx.clearRect(0, 0, 120, 150)

      // 取っ手
      ctx.strokeStyle = LINE
      ctx.lineWidth = 2.4
      ctx.fillStyle = getComputedStyle(cv).getPropertyValue('--color-cream') || '#fff7ef'
      ctx.beginPath()
      ctx.moveTo(A.GR - 4, A.GT + 26)
      ctx.bezierCurveTo(A.GR + 26, A.GT + 23, A.GR + 26, A.GT + 66, A.GR - 4, A.GT + 64)
      ctx.lineTo(A.GR - 4, A.GT + 55)
      ctx.bezierCurveTo(A.GR + 14, A.GT + 57, A.GR + 14, A.GT + 32, A.GR - 4, A.GT + 35)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // ビール（clip）
      ctx.save()
      glassPath()
      ctx.clip()
      // グラス内の泡＝輪郭なしの白い雲（背後に置きビールで裾を覆う）
      if (!full && fill > 0.12) cloud(A.cx, sy + 3, foamK(fill), false)
      if (fill > 0.02) {
        const g = ctx.createLinearGradient(0, A.GT, 0, A.GB)
        g.addColorStop(0, '#fbcf6a')
        g.addColorStop(0.45, '#f2a838')
        g.addColorStop(1, '#d77f22')
        ctx.fillStyle = g
        ctx.fillRect(A.GL - 2, sy, A_W + 4, A.GB - sy + 3)
        // 面取り
        if (fill > 0.1) {
          ctx.strokeStyle = 'rgba(185,112,28,0.4)'
          ctx.lineWidth = 1
          for (const x of DIMPLES) {
            ctx.beginPath()
            ctx.moveTo(x, Math.max(sy, A.GT) + 3)
            ctx.lineTo(x, A.GB - 6)
            ctx.stroke()
          }
        }
        // 昇る気泡（唯一の常時アニメ）
        if (fill > 0.18) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)'
          for (const b of BUBBLES) {
            const rise = reduce ? 0 : ((el / b.dur + b.delay) % 1) * (sy - A.GB + 6)
            const y = A.GB - 8 + rise
            ctx.beginPath()
            ctx.arc(b.x, y, b.r, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        // ハイライト帯
        ctx.fillStyle = 'rgba(255,255,255,0.2)'
        roundRect(A.GL + 7, A.GT + 5, 6, A.GB - A.GT - 12, 3)
        ctx.fill()
      }
      ctx.restore()

      // グラス輪郭
      ctx.strokeStyle = LINE
      ctx.lineWidth = 2.6
      glassPath()
      ctx.stroke()

      // 結露（ビール面より下だけ）
      for (const d of DROPS) {
        if (d.y < sy - 4) continue
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.fill()
        ctx.lineWidth = 0.8
        ctx.strokeStyle = LINE
        ctx.stroke()
      }

      // 冠：当日=あふれ(縁から)＝120% / それ以外の満タン=シンプルな泡頭
      if (dayOf) drawFoamCircles(overflowFoamEdge())
      else if (full) cloud(A.cx, A.GT + 2, 1.18)

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [pct, dayOf])
  return <canvas ref={ref} style={{ width: 120, height: 150 }} />
}

/** 参加の盛り上がりを「ビールが注がれて泡立つ」で。pct=0..1.2（>1=あふれ120%）。
 *  dayOf=true（開催当日）は hero のお肉と同じ jiggle でジョッキごと揺れる。 */
export function BeerMug({
  pct = 0.8,
  dayOf = false,
  label = '盛り上がり',
  sub = 'かんぱい寸前！',
}: {
  pct?: number
  dayOf?: boolean
  label?: string
  sub?: string
}) {
  return (
    <div className="flex flex-col items-center">
      {/* 当日＝heroのお肉と同じ animate.css jiggle（底を軸にジョッキごと）。reduced-motion は自動停止。 */}
      <div
        className={dayOf ? 'animate__animated animate__rubberBand animate__infinite' : undefined}
        style={dayOf ? { ['--animate-duration' as string]: '2.4s', transformOrigin: '50% 100%' } : undefined}
      >
        <div style={{ width: 120 * SCALE, height: 150 * SCALE, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${SCALE})`, transformOrigin: 'top left' }}>
            <BeerCanvas pct={pct} dayOf={dayOf} />
          </div>
        </div>
      </div>
      {label && <p className="mt-3 text-[13px] font-bold text-ink">🍺 {label}</p>}
      <p className={(label ? '' : 'mt-3 ') + 'text-[11px] text-ink-soft'}>{sub}</p>
    </div>
  )
}
