'use client'

// ビールイラスト 試作（ローカルのみ・本番未反映 / deploy 時に /preview ごと削除）。
// パターン×技術のマトリクス比較。実物リファレンス（結露・雲泡・2トーン琥珀・昇る気泡）に基づく。
// 泡は「大小の円が重なった雲」を共有データで定義し、CSS/SVG/Canvas が同じ円を描く＝技術差のみ比較。
import { useEffect, useRef } from 'react'

const LINE = '#3a2a1e'
const FOAM = '#fbf6ea'

// ── パターンA: シズル線画ジョッキ ジオメトリ（120×150 想定） ──
const A = {
  GL: 28,
  GR: 92,
  GT: 38,
  GB: 134,
  cx: 60,
}
const A_W = A.GR - A.GL

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

// ── 100%超え「盛り上がり」＝ビール内現象だけ（記号は使わない） ──
// hype: 1=あふれ / 2=噴き出し / 3=最高潮
function cloudC(ctx: CanvasRenderingContext2D, cx: number, baseY: number, k: number) {
  ctx.fillStyle = LINE
  for (const c of FOAM_CLOUD) {
    ctx.beginPath()
    ctx.arc(cx + c.dx * k, baseY + c.dy * k, c.r * k + 1.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = FOAM
  for (const c of FOAM_CLOUD) {
    ctx.beginPath()
    ctx.arc(cx + c.dx * k, baseY + c.dy * k, c.r * k, 0, Math.PI * 2)
    ctx.fill()
  }
}
const round2 = (n: number) => Math.round(n * 100) / 100 // SSR/CSR の小数ズレ(hydration)防止
// 太く→先細りの“ひと筋の流れ”（縦に重なる円・先は丸い）。x,top から len ぶん下へ
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
// こぼれた泡。なめらかなドーム＋“非対称・局所的”な流れ（等間隔ヒゲにしない）
function overflowFoamCircles(hype: number): [number, number, number][] {
  const c: [number, number, number][] = []
  // なめらかなドーム（少しだけ縁を越える・主役の流れ側=左をやや高く）
  const dome: [number, number, number][] = [
    [-29, 3, 10],
    [-17, -6, 12.5],
    [-3, -11, 14],
    [11, -8, 12.5],
    [24, -1, 10.5],
    [-10, -17, 9],
    [7, -15, 8.5],
  ]
  for (const [dx, dy, r] of dome) c.push([A.cx + dx, A.GT + dy, r])
  // 主役の流れ：左寄り1本（長い）。hype で伸びる
  pushRun(c, A.cx - 15, A.GT + 8, 16 + hype * 9, 8.5, 1)
  // 小さなしたたり：右寄りにちょい（短い）
  pushRun(c, A.cx + 21, A.GT + 10, 7, 5.5, 4)
  // 副次の流れ：噴き出し以降だけ（右中央・中くらい）
  if (hype >= 2) pushRun(c, A.cx + 9, A.GT + 9, 9 + hype * 5, 7, 6)
  return c
}
// 絵文字/イラスト調のあふれ：なめらかな丸いドーム＋短く太い“丸い垂れ”（リアルすぎない）
function overflowFoamStylized(): [number, number, number][] {
  const c: [number, number, number][] = []
  // 左を高く盛って右へ流れる“非対称”ドーム（絵文字の偏り方）。一回り大きめ
  const dome: [number, number, number][] = [
    [-30, 3, 13.5],
    [-15, -12, 16],
    [-1, -10, 14.5],
    [14, -4, 13],
    [27, 5, 11],
    [-11, -21, 10],
    [11, -18, 9.5],
  ]
  for (const [dx, dy, r] of dome) c.push([A.cx + dx, A.GT + dy, r])
  // こぼれは右寄りに偏らせる（主役は右側を下まで／脇1本／左は小さなリップだけ）
  const drips: [number, number, number][] = [
    [16, 70, 9.5], // 主役（右寄り・グラス下方まで垂らす）
    [3, 14, 8.5], // 脇（中央・短め）
    [-22, 7, 6.5], // 左の小さなリップ
  ]
  drips.forEach(([dx, len, r0]) => {
    let cy = A.GT + 9
    let rr = r0
    while (cy < A.GT + 9 + len) {
      // 下へ行くほど少し蛇行＋細く（垂れた跡）。最小幅は保つ
      c.push([round2(A.cx + dx + Math.sin(cy * 0.12) * 1.2), round2(cy), round2(Math.max(4, rr))])
      cy += Math.max(4, rr) * 0.85
      rr -= 0.9
    }
  })
  return c
}
// 縁の角からスタートして“右壁をなぞって”流れ落ちる垂れ（下へ行くほど壁側へ寄る）
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
// 絵文字調・右の「ふちから流れる」版：右の縁を盛り、その角から右壁をなぞって下まで垂らす
function overflowFoamStylizedEdge(): [number, number, number][] {
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
function drawFoamCircles(ctx: CanvasRenderingContext2D, cs: [number, number, number][]) {
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
function drawHypeC(ctx: CanvasRenderingContext2D, hype: number, t: number) {
  if (hype === 5) {
    drawFoamCircles(ctx, overflowFoamStylizedEdge()) // あふれ(縁から)・静止
    return
  }
  if (hype === 4) {
    drawFoamCircles(ctx, overflowFoamStylized()) // あふれ(絵文字調)
    return
  }
  drawFoamCircles(ctx, overflowFoamCircles(hype)) // 縁から膨らんで垂れる一塊の泡（リアル）
  // 噴き出すしぶき（＝泡のかたまり。Lv2+）
  if (hype >= 2) {
    const flecks: [number, number, number][] = [
      [A.cx - 32, A.GT - 17, 1.0],
      [A.cx + 30, A.GT - 14, 1.3],
      [A.cx - 12, A.GT - 31, 1.6],
      [A.cx + 16, A.GT - 28, 1.1],
    ]
    for (const [fx, fy, spd] of flecks) {
      const rise = (t * spd * 6) % 14
      cloudC(ctx, fx, fy - rise, 0.32)
    }
  }
  // 最高潮：結露どっさり＋濡れたグラスの照り（記号でなく光）
  if (hype >= 3) {
    const extra: [number, number][] = [
      [A.GL + 11, A.GB - 52],
      [A.GR - 12, A.GB - 60],
      [A.cx - 7, A.GB - 30],
      [A.GR - 9, A.GB - 32],
      [A.GL + 16, A.GB - 30],
    ]
    ctx.lineWidth = 0.8
    ctx.strokeStyle = LINE
    for (const [dx, dy] of extra) {
      ctx.beginPath()
      ctx.arc(dx, dy, 2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fill()
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.beginPath()
    ctx.ellipse(A.GL + 12, A.GT + 32, 2.4, 9, 0.2, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ════════════════════════ A / SVG ════════════════════════
export function A_SVG({ pct }: { pct: number }) {
  const sy = surfA(pct)
  const overflow = pct >= 0.95
  const glass = `M${A.GL},${A.GT + 5} Q${A.GL},${A.GT} ${A.GL + 5},${A.GT} L${A.GR - 5},${A.GT} Q${A.GR},${A.GT} ${A.GR},${A.GT + 5} L${A.GR},${A.GB - 14} Q${A.GR},${A.GB} ${A.GR - 14},${A.GB} L${A.GL + 14},${A.GB} Q${A.GL},${A.GB} ${A.GL},${A.GB - 14} Z`
  const handle = `M${A.GR - 4},${A.GT + 26} C${A.GR + 26},${A.GT + 23} ${A.GR + 26},${A.GT + 66} ${A.GR - 4},${A.GT + 64} L${A.GR - 4},${A.GT + 55} C${A.GR + 14},${A.GT + 57} ${A.GR + 14},${A.GT + 32} ${A.GR - 4},${A.GT + 35} Z`
  return (
    <svg width={120} height={150} viewBox="0 0 120 150" fill="none">
      <defs>
        <clipPath id="asvgGlass">
          <path d={glass} />
        </clipPath>
        <linearGradient id="asvgBeer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbcf6a" />
          <stop offset="0.45" stopColor="#f2a838" />
          <stop offset="1" stopColor="#d77f22" />
        </linearGradient>
      </defs>
      <path d={handle} fill="var(--color-cream)" stroke={LINE} strokeWidth={2.4} strokeLinejoin="round" />
      <g clipPath="url(#asvgGlass)">
        {/* グラス内の泡＝輪郭なしの白い雲（ガラス越しでハード線を出さない） */}
        {!overflow && pct > 0.12 && <FoamSVG cx={A.cx} baseY={sy + 3} k={foamK(pct)} outline={false} />}
        {pct > 0.02 && <rect x={A.GL - 2} y={sy} width={A_W + 4} height={A.GB - sy + 3} fill="url(#asvgBeer)" />}
        {/* 面取りの縦線 */}
        {pct > 0.1 &&
          DIMPLES.map((x) => (
            <line key={x} x1={x} y1={Math.max(sy, A.GT) + 3} x2={x} y2={A.GB - 6} stroke="#b9701c" strokeWidth={1} opacity={0.4} />
          ))}
        {/* 昇る気泡 */}
        {pct > 0.18 &&
          BUBBLES.map((b, i) => (
            <circle key={i} cx={b.x} cy={A.GB - 8} r={b.r} fill="#fff" opacity={0.7} style={{ animation: `bubrise ${b.dur}s linear ${b.delay}s infinite` }} />
          ))}
        {/* ハイライト帯 */}
        <rect x={A.GL + 7} y={A.GT + 5} width={6} height={A.GB - A.GT - 12} rx={3} fill="#fff" opacity={0.2} />
      </g>
      <path d={glass} fill="none" stroke={LINE} strokeWidth={2.6} strokeLinejoin="round" />
      {/* 結露（ビール面より下だけ＝空っぽの上半分に浮かせない） */}
      {DROPS.filter((d) => d.y >= sy - 4).map((d, i) => (
        <g key={i}>
          <circle cx={d.x} cy={d.y} r={d.r} fill="#fff" stroke={LINE} strokeWidth={0.8} opacity={0.85} />
          <circle cx={d.x - d.r * 0.3} cy={d.y - d.r * 0.3} r={d.r * 0.35} fill="#fff" />
        </g>
      ))}
      {/* 満タン: あふれ＋したたり */}
      {overflow && (
        <>
          <FoamSVG cx={A.cx} baseY={A.GT + 2} k={1.18} />
          <path d={`M${A.GL + 6},${A.GT + 4} q-4,11 0,19 q4,4 6,-2 q2,-10 -1,-17 Z`} fill={FOAM} stroke={LINE} strokeWidth={2.2} strokeLinejoin="round" />
          <path d={`M${A.GR - 10},${A.GT + 7} q5,8 2,15 q-4,4 -6,-2 q-1,-7 0,-12 Z`} fill={FOAM} stroke={LINE} strokeWidth={2.2} strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}
// 雲泡。outline=true で暗い大円(背)＋白円(前)の union 輪郭（溢れ＝cream背景用）。
// outline=false は白い雲だけ（グラス内＝ガラス越しでハード線を出さない）。
function FoamSVG({ cx, baseY, k = 1, outline = true }: { cx: number; baseY: number; k?: number; outline?: boolean }) {
  return (
    <>
      {outline &&
        FOAM_CLOUD.map((c, i) => (
          <circle key={`o${i}`} cx={cx + c.dx * k} cy={baseY + c.dy * k} r={c.r * k + 1.4} fill={LINE} />
        ))}
      {FOAM_CLOUD.map((c, i) => (
        <circle key={`f${i}`} cx={cx + c.dx * k} cy={baseY + c.dy * k} r={c.r * k} fill={FOAM} />
      ))}
    </>
  )
}

// ════════════════════════ A / CSS ════════════════════════
export function A_CSS({ pct, hype = 0, wob }: { pct: number; hype?: number; wob?: 'mass' | 'drip' | 'breathe' | 'mug' }) {
  const sy = surfA(pct)
  const overflow = pct >= 0.95
  // ジョッキごと揺らす（wob='mug'）＝ルートに sway（底を軸に）
  const rootAnim = wob === 'mug' ? { transformOrigin: '50% 100%', animation: 'foamsway 3.6s ease-in-out infinite' } : {}
  return (
    <div className="relative" style={{ width: 120, height: 150, ...rootAnim }}>
      {/* 取っ手 */}
      <div
        className="absolute"
        style={{ right: 8, top: A.GT + 24, width: 26, height: 44, border: `2.6px solid ${LINE}`, borderLeft: 'none', borderRadius: '0 16px 16px 0', background: 'var(--color-cream)' }}
      />
      {/* グラス（clip） */}
      <div
        className="absolute overflow-hidden"
        style={{ left: A.GL, top: A.GT, width: A_W, height: A.GB - A.GT, border: `2.6px solid ${LINE}`, borderRadius: '6px 6px 15px 15px' }}
      >
        {/* グラス内の泡＝輪郭なしの白い雲 */}
        {!overflow && pct > 0.12 && <FoamCSS cx={A.cx - A.GL} baseY={sy - A.GT + 3} k={foamK(pct)} outline={false} />}
        {/* ビール（2トーン・泡の裾を覆う） */}
        {pct > 0.02 && (
          <div className="absolute inset-x-0" style={{ bottom: 0, height: `${pct * 100}%`, background: 'linear-gradient(180deg,#fbcf6a,#f2a838 45%,#d77f22)' }}>
            {/* 面取り */}
            {pct > 0.1 && DIMPLES.map((x) => <div key={x} className="absolute" style={{ left: x - A.GL, top: 2, bottom: 4, width: 1, background: '#b9701c', opacity: 0.4 }} />)}
            {/* 昇る気泡 */}
            {pct > 0.18 && BUBBLES.map((b, i) => <span key={i} className="absolute rounded-full bg-white" style={{ left: b.x - A.GL, bottom: 4, width: b.r * 2, height: b.r * 2, opacity: 0.7, animation: `bubrise ${b.dur}s linear ${b.delay}s infinite` }} />)}
          </div>
        )}
        {/* ハイライト帯 */}
        <div className="absolute rounded-full bg-white" style={{ left: 7, top: 5, width: 6, height: A.GB - A.GT - 14, opacity: 0.2 }} />
      </div>
      {/* 結露（ビール面より下だけ） */}
      {DROPS.filter((d) => d.y >= sy - 4).map((d, i) => (
        <span key={i} className="absolute rounded-full" style={{ left: d.x - d.r, top: d.y - d.r, width: d.r * 2, height: d.r * 2, background: '#fff', border: `0.8px solid ${LINE}`, opacity: 0.85 }} />
      ))}
      {/* 満タン: あふれ */}
      {overflow && hype === 0 && <FoamCSS cx={A.cx} baseY={A.GT + 2} k={1.18} />}
      {/* 100%超え: 盛り上がり（ビール内現象だけ） */}
      {hype > 0 &&
        (wob && wob !== 'mug' ? (
          <div
            className="absolute inset-0"
            style={{
              transformOrigin: wob === 'drip' ? '50% 28%' : '50% 72%',
              animation: wob === 'breathe' ? 'foambreathe 3.4s ease-in-out infinite' : 'foamsway 3.6s ease-in-out infinite',
            }}
          >
            <HypeCSS hype={hype} />
          </div>
        ) : (
          <HypeCSS hype={hype} />
        ))}
    </div>
  )
}

// CSS版の「盛り上がり」＝記号なし。高い泡頭＋全方位カスケード＋しぶき＋結露/照り
function HypeCSS({ hype }: { hype: number }) {
  const stylized = hype === 4 || hype === 5
  const foam = hype === 5 ? overflowFoamStylizedEdge() : hype === 4 ? overflowFoamStylized() : overflowFoamCircles(hype)
  const flecks: [number, number][] = [
    [A.cx - 32, A.GT - 17],
    [A.cx + 30, A.GT - 14],
    [A.cx - 12, A.GT - 31],
    [A.cx + 16, A.GT - 28],
  ]
  const drops3: [number, number][] = [
    [A.GL + 11, A.GB - 52],
    [A.GR - 12, A.GB - 60],
    [A.cx - 7, A.GB - 30],
    [A.GR - 9, A.GB - 32],
    [A.GL + 16, A.GB - 30],
  ]
  return (
    <>
      {/* 縁から膨らんで垂れる一塊の泡（暗→白で union 輪郭） */}
      {foam.map(([x, y, r], i) => (
        <span key={`fo${i}`} className="absolute rounded-full" style={{ left: x - r - 1.4, top: y - r - 1.4, width: (r + 1.4) * 2, height: (r + 1.4) * 2, background: LINE }} />
      ))}
      {foam.map(([x, y, r], i) => (
        <span key={`ff${i}`} className="absolute rounded-full" style={{ left: x - r, top: y - r, width: r * 2, height: r * 2, background: FOAM }} />
      ))}
      {/* しぶき（泡のかたまり・Lv2+。絵文字調=4は無し） */}
      {!stylized && hype >= 2 && flecks.map(([fx, fy], i) => <FoamCSS key={`fl${i}`} cx={fx} baseY={fy} k={0.32} />)}
      {/* 最高潮：結露どっさり＋濡れガラスの照り（Lv3） */}
      {!stylized && hype >= 3 &&
        drops3.map(([dx, dy], i) => (
          <span key={`d3${i}`} className="absolute rounded-full" style={{ left: dx - 2, top: dy - 2, width: 4, height: 4, background: '#fff', border: `0.8px solid ${LINE}`, opacity: 0.9 }} />
        ))}
      {!stylized && hype >= 3 && <span className="absolute" style={{ left: A.GL + 10, top: A.GT + 23, width: 5, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.45)', transform: 'rotate(10deg)' }} />}
    </>
  )
}
function FoamCSS({ cx, baseY, k = 1, outline = true }: { cx: number; baseY: number; k?: number; outline?: boolean }) {
  return (
    <>
      {outline &&
        FOAM_CLOUD.map((c, i) => {
          const r = c.r * k
          return <span key={`o${i}`} className="absolute rounded-full" style={{ left: cx + c.dx * k - r - 1.4, top: baseY + c.dy * k - r - 1.4, width: (r + 1.4) * 2, height: (r + 1.4) * 2, background: LINE }} />
        })}
      {FOAM_CLOUD.map((c, i) => {
        const r = c.r * k
        return <span key={`f${i}`} className="absolute rounded-full" style={{ left: cx + c.dx * k - r, top: baseY + c.dy * k - r, width: r * 2, height: r * 2, background: FOAM }} />
      })}
    </>
  )
}

// ════════════════════════ A / Canvas ════════════════════════
export function A_Canvas({ pct, hype = 0 }: { pct: number; hype?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    cv.width = 120 * dpr
    cv.height = 150 * dpr
    ctx.scale(dpr, dpr)
    const overflow = pct >= 0.95
    const sy = surfA(pct)
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
      if (!overflow && pct > 0.12) cloud(A.cx, sy + 3, foamK(pct), false)
      if (pct > 0.02) {
        const g = ctx.createLinearGradient(0, A.GT, 0, A.GB)
        g.addColorStop(0, '#fbcf6a')
        g.addColorStop(0.45, '#f2a838')
        g.addColorStop(1, '#d77f22')
        ctx.fillStyle = g
        ctx.fillRect(A.GL - 2, sy, A_W + 4, A.GB - sy + 3)
        // 面取り
        if (pct > 0.1) {
          ctx.strokeStyle = 'rgba(185,112,28,0.4)'
          ctx.lineWidth = 1
          for (const x of DIMPLES) {
            ctx.beginPath()
            ctx.moveTo(x, Math.max(sy, A.GT) + 3)
            ctx.lineTo(x, A.GB - 6)
            ctx.stroke()
          }
        }
        // 昇る気泡
        if (pct > 0.18) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)'
          for (const b of BUBBLES) {
            const rise = reduce ? 0 : (((el / b.dur + b.delay) % 1) * (sy - A.GB + 6))
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

      if (overflow && hype === 0) cloud(A.cx, A.GT + 2, 1.18)
      if (hype > 0) drawHypeC(ctx, hype, reduce ? 0 : el)

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [pct, hype])
  return <canvas ref={ref} style={{ width: 120, height: 150 }} />
}

// ════════════════════════ パターンB: フラットPop（輪郭なし・3技術） ════════════════════════
const B = { GL: 34, GR: 86, GT: 40, GB: 132, cx: 60 }
const B_W = B.GR - B.GL
const B_FOAM: Circ[] = [
  { dx: -18, dy: -3, r: 9 },
  { dx: -6, dy: -8, r: 11 },
  { dx: 7, dy: -8, r: 11 },
  { dx: 18, dy: -3, r: 9 },
  { dx: 0, dy: 0, r: 10 },
]
function surfB(pct: number) {
  return B.GB - pct * (B.GB - B.GT)
}

export function B_SVG({ pct }: { pct: number }) {
  const sy = surfB(pct)
  const glass = `M${B.GL + 2},${B.GT} L${B.GR - 2},${B.GT} L${B.GR - 5},${B.GB - 6} Q${B.GR - 5},${B.GB} ${B.GR - 11},${B.GB} L${B.GL + 11},${B.GB} Q${B.GL + 5},${B.GB} ${B.GL + 5},${B.GB - 6} Z`
  return (
    <svg width={120} height={150} viewBox="0 0 120 150" fill="none">
      <defs>
        <clipPath id="bsvg">
          <path d={glass} />
        </clipPath>
      </defs>
      {/* 影 */}
      <ellipse cx={B.cx} cy={B.GB + 7} rx={26} ry={4} fill="#000" opacity={0.08} />
      <g clipPath="url(#bsvg)">
        {pct > 0.02 && (
          <>
            <rect x={B.GL} y={sy} width={B_W} height={B.GB - sy} fill="#e98e26" />
            <rect x={B.GL} y={sy} width={B_W} height={Math.max(0, (B.GB - sy) * 0.4)} fill="#f6b23e" />
            {pct > 0.12 && BUBBLES.map((b, i) => <circle key={i} cx={b.x} cy={B.GB - 8} r={b.r} fill="#fff" opacity={0.8} style={{ animation: `bubrise ${b.dur}s linear ${b.delay}s infinite` }} />)}
          </>
        )}
      </g>
      {pct > 0.12 && B_FOAM.map((c, i) => <circle key={i} cx={B.cx + c.dx} cy={sy + c.dy} r={c.r} fill="#fdfaf2" />)}
    </svg>
  )
}
export function B_CSS({ pct }: { pct: number }) {
  const sy = surfB(pct)
  return (
    <div className="relative" style={{ width: 120, height: 150 }}>
      <div className="absolute rounded-full" style={{ left: B.cx - 26, top: B.GB + 3, width: 52, height: 8, background: '#000', opacity: 0.08 }} />
      <div className="absolute overflow-hidden" style={{ left: B.GL + 2, top: B.GT, width: B_W - 4, height: B.GB - B.GT, clipPath: 'polygon(0 0,100% 0,93% 100%,7% 100%)' }}>
        {pct > 0.02 && (
          <div className="absolute inset-x-0" style={{ bottom: 0, height: `${pct * 100}%`, background: '#e98e26' }}>
            <div className="absolute inset-x-0 top-0" style={{ height: '40%', background: '#f6b23e' }} />
            {pct > 0.12 && BUBBLES.map((b, i) => <span key={i} className="absolute rounded-full bg-white" style={{ left: b.x - B.GL - 2, bottom: 4, width: b.r * 2, height: b.r * 2, opacity: 0.8, animation: `bubrise ${b.dur}s linear ${b.delay}s infinite` }} />)}
          </div>
        )}
      </div>
      {pct > 0.12 && B_FOAM.map((c, i) => <span key={i} className="absolute rounded-full" style={{ left: B.cx + c.dx - c.r, top: sy + c.dy - c.r, width: c.r * 2, height: c.r * 2, background: '#fdfaf2' }} />)}
    </div>
  )
}
export function B_Canvas({ pct }: { pct: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    cv.width = 120 * dpr
    cv.height = 150 * dpr
    ctx.scale(dpr, dpr)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sy = surfB(pct)
    let raf = 0
    let t0 = 0
    const glassPath = () => {
      ctx.beginPath()
      ctx.moveTo(B.GL + 2, B.GT)
      ctx.lineTo(B.GR - 2, B.GT)
      ctx.lineTo(B.GR - 5, B.GB - 6)
      ctx.quadraticCurveTo(B.GR - 5, B.GB, B.GR - 11, B.GB)
      ctx.lineTo(B.GL + 11, B.GB)
      ctx.quadraticCurveTo(B.GL + 5, B.GB, B.GL + 5, B.GB - 6)
      ctx.closePath()
    }
    const draw = (ts: number) => {
      if (!t0) t0 = ts
      const el = (ts - t0) / 1000
      ctx.clearRect(0, 0, 120, 150)
      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      ctx.beginPath()
      ctx.ellipse(B.cx, B.GB + 7, 26, 4, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.save()
      glassPath()
      ctx.clip()
      if (pct > 0.02) {
        ctx.fillStyle = '#e98e26'
        ctx.fillRect(B.GL, sy, B_W, B.GB - sy)
        ctx.fillStyle = '#f6b23e'
        ctx.fillRect(B.GL, sy, B_W, (B.GB - sy) * 0.4)
        if (pct > 0.12) {
          ctx.fillStyle = 'rgba(255,255,255,0.8)'
          for (const b of BUBBLES) {
            const rise = reduce ? 0 : (((el / b.dur + b.delay) % 1) * (sy - B.GB + 6))
            ctx.beginPath()
            ctx.arc(b.x, B.GB - 8 + rise, b.r, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      ctx.restore()
      if (pct > 0.12) {
        ctx.fillStyle = '#fdfaf2'
        for (const c of B_FOAM) {
          ctx.beginPath()
          ctx.arc(B.cx + c.dx, sy + c.dy, c.r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [pct])
  return <canvas ref={ref} style={{ width: 120, height: 150 }} />
}

// ════════════════════════════════════════════════════════════════════════
//  各技術の“得意技”ショーケース（同設計の横並びでなく、各媒体の強みを活かす）
// ════════════════════════════════════════════════════════════════════════
const glassA = `M${A.GL},${A.GT + 5} Q${A.GL},${A.GT} ${A.GL + 5},${A.GT} L${A.GR - 5},${A.GT} Q${A.GR},${A.GT} ${A.GR},${A.GT + 5} L${A.GR},${A.GB - 14} Q${A.GR},${A.GB} ${A.GR - 14},${A.GB} L${A.GL + 14},${A.GB} Q${A.GL},${A.GB} ${A.GL},${A.GB - 14} Z`
const handleA = `M${A.GR - 4},${A.GT + 26} C${A.GR + 26},${A.GT + 23} ${A.GR + 26},${A.GT + 66} ${A.GR - 4},${A.GT + 64} L${A.GR - 4},${A.GT + 55} C${A.GR + 14},${A.GT + 57} ${A.GR + 14},${A.GT + 32} ${A.GR - 4},${A.GT + 35} Z`

// ── SVG の得意技：フィルタ(ぼかしクリーミー泡)＋マスク(照りスイープ)＋ドロップシャドウ ──
export function Show_SVG({ pct = 0.55 }: { pct: number }) {
  const sy = surfA(pct)
  const k = foamK(pct)
  return (
    <svg width={120} height={150} viewBox="0 0 120 150" fill="none">
      <defs>
        <linearGradient id="shBeer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdd472" />
          <stop offset="0.5" stopColor="#f2a838" />
          <stop offset="1" stopColor="#d57c20" />
        </linearGradient>
        <linearGradient id="shShine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="shCreamy" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
        <filter id="shDrop" x="-30%" y="-20%" width="160%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.3" floodColor="#7e001d" floodOpacity="0.18" />
        </filter>
        <clipPath id="shGlass">
          <path d={glassA} />
        </clipPath>
      </defs>
      <path d={handleA} fill="var(--color-cream)" stroke={LINE} strokeWidth={2.4} strokeLinejoin="round" />
      <g clipPath="url(#shGlass)">
        {/* クリーミー泡を背後に置き、ビールで裾を覆う（黒境界を消す） */}
        {pct > 0.12 && (
          <g filter="url(#shCreamy)">
            {FOAM_CLOUD.map((c, i) => (
              <circle key={`f${i}`} cx={A.cx + c.dx * k} cy={sy + 3 + c.dy * k} r={c.r * k} fill={FOAM} />
            ))}
          </g>
        )}
        <rect x={A.GL - 2} y={sy} width={A_W + 4} height={A.GB - sy + 3} fill="url(#shBeer)" />
        {/* 照りスイープ（マスク的グラデを横移動） */}
        <rect x={-34} y={A.GT} width={26} height={A.GB - A.GT} fill="url(#shShine)" style={{ animation: 'shine 3.2s ease-in-out infinite' }} />
      </g>
      <path d={glassA} fill="none" stroke={LINE} strokeWidth={2.6} strokeLinejoin="round" filter="url(#shDrop)" />
    </svg>
  )
}

// ── Canvas の得意技：多数の泡パーティクル（密度・揺らぎ）＋泡面のフィズ ──
export function Show_Canvas({ pct = 0.55, hype = 0 }: { pct: number; hype?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    cv.width = 120 * dpr
    cv.height = 150 * dpr
    ctx.scale(dpr, dpr)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sy = surfA(pct)
    const overflow = pct >= 0.95
    // 泡パーティクル（Canvasが得意な密度）
    const N = 42
    const ps = Array.from({ length: N }, () => ({
      x: A.GL + 4 + Math.random() * (A_W - 8),
      y: A.GB - Math.random() * (A.GB - sy),
      r: 0.6 + Math.random() * 1.8,
      sp: 8 + Math.random() * 22,
      ph: Math.random() * 6.28,
    }))
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
    let raf = 0
    let last = 0
    const draw = (ts: number) => {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0
      last = ts
      ctx.clearRect(0, 0, 120, 150)
      // 取っ手
      ctx.strokeStyle = LINE
      ctx.lineWidth = 2.4
      ctx.fillStyle = '#fff7ef'
      ctx.beginPath()
      ctx.moveTo(A.GR - 4, A.GT + 26)
      ctx.bezierCurveTo(A.GR + 26, A.GT + 23, A.GR + 26, A.GT + 66, A.GR - 4, A.GT + 64)
      ctx.lineTo(A.GR - 4, A.GT + 55)
      ctx.bezierCurveTo(A.GR + 14, A.GT + 57, A.GR + 14, A.GT + 32, A.GR - 4, A.GT + 35)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.save()
      glassPath()
      ctx.clip()
      // グラス内の泡面フィズ＝輪郭なし白い雲（背後・ビールで裾を覆う）
      const fk = foamK(pct)
      if (!overflow && pct > 0.12) {
        ctx.fillStyle = '#fbf6ea'
        for (const c of FOAM_CLOUD) {
          ctx.beginPath()
          ctx.arc(A.cx + c.dx * fk, sy + 3 + c.dy * fk, c.r * fk, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      const g = ctx.createLinearGradient(0, A.GT, 0, A.GB)
      g.addColorStop(0, '#fdd472')
      g.addColorStop(0.5, '#f2a838')
      g.addColorStop(1, '#d57c20')
      ctx.fillStyle = g
      ctx.fillRect(A.GL - 2, sy, A_W + 4, A.GB - sy + 3)
      // パーティクル（ビールの上＝液中で昇る）
      for (const p of ps) {
        if (!reduce) {
          p.y -= p.sp * dt
          p.x += Math.sin(ts / 600 + p.ph) * 0.25
          if (p.y < sy + 2) {
            p.y = A.GB - 2
            p.x = A.GL + 4 + Math.random() * (A_W - 8)
          }
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fill()
      }
      ctx.restore()
      ctx.strokeStyle = LINE
      ctx.lineWidth = 2.6
      glassPath()
      ctx.stroke()
      // 満タン＝溢れの冠（リム上・クリップ外なので輪郭つき。A-CSS と同設定＝したたり無し）
      if (overflow && hype === 0) {
        const k = 1.18
        ctx.fillStyle = LINE
        for (const c of FOAM_CLOUD) {
          ctx.beginPath()
          ctx.arc(A.cx + c.dx * k, A.GT + 2 + c.dy * k, c.r * k + 1.4, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = '#fbf6ea'
        for (const c of FOAM_CLOUD) {
          ctx.beginPath()
          ctx.arc(A.cx + c.dx * k, A.GT + 2 + c.dy * k, c.r * k, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (hype > 0) drawHypeC(ctx, hype, reduce ? 0 : ts / 1000)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [pct, hype])
  return <canvas ref={ref} style={{ width: 120, height: 150 }} />
}

// ── CSS の得意技：多層グラデ＋mix-blend-mode の照り＋3D傾け（無依存・JSなしでも成立） ──
export function Show_CSS({ pct = 0.55 }: { pct: number }) {
  return (
    <div style={{ width: 120, height: 150, perspective: 420 }}>
      <div className="relative" style={{ width: 120, height: 150, transform: 'rotateY(-15deg)', transformStyle: 'preserve-3d' }}>
        {/* 取っ手 */}
        <div className="absolute" style={{ right: 8, top: A.GT + 24, width: 26, height: 44, border: `2.6px solid ${LINE}`, borderLeft: 'none', borderRadius: '0 16px 16px 0', background: 'var(--color-cream)' }} />
        <div className="absolute overflow-hidden" style={{ left: A.GL, top: A.GT, width: A_W, height: A.GB - A.GT, border: `2.6px solid ${LINE}`, borderRadius: '6px 6px 15px 15px' }}>
          {/* グラス内の泡＝輪郭なしの白い雲 */}
          {pct > 0.12 && <FoamCSS cx={A.cx - A.GL} baseY={surfA(pct) - A.GT + 3} k={foamK(pct)} outline={false} />}
          {/* ビール：多層グラデ（縦の琥珀＋斜めの光） */}
          <div className="absolute inset-x-0" style={{ bottom: 0, height: `${pct * 100}%`, background: 'linear-gradient(180deg,#fdd472,#f2a838 50%,#d57c20), radial-gradient(120% 60% at 30% 0%, rgba(255,255,255,0.5), transparent 60%)', backgroundBlendMode: 'screen' }}>
            {/* mix-blend-mode の照り */}
            <div className="absolute" style={{ left: -10, top: 0, bottom: 0, width: 22, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.85),transparent)', mixBlendMode: 'screen', animation: 'shine 3.2s ease-in-out infinite' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
