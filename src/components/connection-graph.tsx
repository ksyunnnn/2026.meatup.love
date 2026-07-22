'use client'
// The live social graph for the projector (issue #11 / #14). A canvas force
// simulation ported from the approved mock: nodes grow with degree, edges pulse
// a spark when they appear, public staff glow, and name labels are placed
// biggest-first with overlap culling (up to ~half the room) so it never turns
// into an unreadable jumble. Staff are named only when they reach the top 3.
import { useEffect, useRef } from 'react'

export interface GraphNodeInput {
  uid: string
  name: string
}
export interface GraphEdgeInput {
  a: string
  b: string
}

interface Node {
  uid: string
  name: string
  x: number
  y: number
  vx: number
  vy: number
  deg: number
  pulse: number
}

export default function ConnectionGraph({
  nodes,
  edges,
  staff,
  top3,
}: {
  nodes: GraphNodeInput[]
  edges: GraphEdgeInput[]
  staff: Set<string>
  top3: Set<string>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Live props read from inside the animation loop. Synced in an effect (not
  // during render) so the rAF loop always sees the latest data without a remount.
  const nodesInput = useRef(nodes)
  const edgesInput = useRef(edges)
  const staffRef = useRef(staff)
  const top3Ref = useRef(top3)
  useEffect(() => {
    nodesInput.current = nodes
    edgesInput.current = edges
    staffRef.current = staff
    top3Ref.current = top3
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    let W = 0
    let H = 0
    let raf = 0
    let tick = 0
    let stopped = false

    const model = new Map<string, Node>()
    const eArr: { a: string; b: string; t: number }[] = []
    const eSet = new Set<string>()

    const size = () => {
      // clientWidth/Height are LAYOUT sizes — unaffected by a CSS transform on an
      // ancestor. /live scales the whole stage with transform:scale(); the sim
      // must run at the stage's fixed logical size so the composition is identical
      // on every device (getBoundingClientRect would return the scaled size).
      W = canvas.clientWidth
      H = canvas.clientHeight
      canvas.width = W * DPR
      canvas.height = H * DPR
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }

    const sync = () => {
      // add new nodes (drop-in near center), keep existing positions
      const seen = new Set<string>()
      for (const n of nodesInput.current) {
        seen.add(n.uid)
        const existing = model.get(n.uid)
        if (existing) existing.name = n.name
        else
          model.set(n.uid, {
            uid: n.uid,
            name: n.name,
            x: W / 2 + (Math.random() - 0.5) * W * 0.6,
            y: H / 2 + (Math.random() - 0.5) * H * 0.6,
            vx: 0,
            vy: 0,
            deg: 0,
            pulse: 0,
          })
      }
      for (const uid of [...model.keys()]) if (!seen.has(uid)) model.delete(uid)
      // add new edges (only where both endpoints exist), pulse them
      for (const e of edgesInput.current) {
        const key = e.a < e.b ? `${e.a}__${e.b}` : `${e.b}__${e.a}`
        if (eSet.has(key)) continue
        if (!model.get(e.a) || !model.get(e.b)) continue
        eSet.add(key)
        eArr.push({ a: e.a, b: e.b, t: 0 })
        const na = model.get(e.a)!
        const nb = model.get(e.b)!
        na.pulse = 1
        nb.pulse = 1
      }
      // recompute degrees
      for (const n of model.values()) n.deg = 0
      for (const e of eArr) {
        const na = model.get(e.a)
        const nb = model.get(e.b)
        if (na) na.deg++
        if (nb) nb.deg++
      }
    }

    const radiusOf = (n: Node) => 3.6 + Math.min(n.deg, 9) * 0.95

    const step = () => {
      if (stopped) return
      tick++
      sync()
      const list = [...model.values()]
      // repulsion
      for (let i = 0; i < list.length; i++) {
        const p = list[i]
        for (let j = i + 1; j < list.length; j++) {
          const q = list[j]
          const dx = p.x - q.x
          const dy = p.y - q.y
          const d2 = dx * dx + dy * dy + 0.01
          const d = Math.sqrt(d2)
          if (d < 210) {
            const f = 620 / d2
            const fx = (dx / d) * f
            const fy = (dy / d) * f
            p.vx += fx
            p.vy += fy
            q.vx -= fx
            q.vy -= fy
          }
        }
        p.vx += (W / 2 - p.x) * 0.0012
        p.vy += (H / 2 - p.y) * 0.0012
      }
      // springs
      for (const e of eArr) {
        const A = model.get(e.a)!
        const B = model.get(e.b)!
        const dx = B.x - A.x
        const dy = B.y - A.y
        const d = Math.sqrt(dx * dx + dy * dy) + 0.01
        const f = (d - 82) * 0.011
        const fx = (dx / d) * f
        const fy = (dy / d) * f
        A.vx += fx
        A.vy += fy
        B.vx -= fx
        B.vy -= fy
        if (e.t < 1) e.t += 0.04
      }
      for (const p of list) {
        p.vx *= 0.86
        p.vy *= 0.86
        p.x += p.vx * 0.5
        p.y += p.vy * 0.5
        p.x = Math.max(16, Math.min(W - 16, p.x))
        p.y = Math.max(16, Math.min(H - 30, p.y))
        if (p.pulse > 0) p.pulse *= 0.95
      }
      draw(list)
      raf = requestAnimationFrame(step)
    }

    const draw = (list: Node[]) => {
      ctx.clearRect(0, 0, W, H)
      const staffSet = staffRef.current
      const top3Set = top3Ref.current
      // edges
      for (const e of eArr) {
        const A = model.get(e.a)!
        const B = model.get(e.b)!
        ctx.strokeStyle = `rgba(255,180,140,${0.1 + 0.12 * e.t})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(A.x, A.y)
        ctx.lineTo(A.x + (B.x - A.x) * e.t, A.y + (B.y - A.y) * e.t)
        ctx.stroke()
        if (e.t < 1) {
          ctx.fillStyle = '#ff6500'
          ctx.beginPath()
          ctx.arc(A.x + (B.x - A.x) * e.t, A.y + (B.y - A.y) * e.t, 2.4, 0, 7)
          ctx.fill()
        }
      }
      // node circles
      for (let i = 0; i < list.length; i++) {
        const p = list[i]
        const r = radiusOf(p)
        const isStaff = staffSet.has(p.uid)
        if (isStaff) {
          const gr = r + 18
          const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, gr)
          g.addColorStop(0, 'rgba(255,120,40,.55)')
          g.addColorStop(1, 'rgba(255,120,40,0)')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(p.x, p.y, gr + Math.sin(tick * 0.08 + i) * 3, 0, 7)
          ctx.fill()
        }
        if (p.pulse > 0.05) {
          ctx.fillStyle = `rgba(255,220,150,${p.pulse * 0.5})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, r + 9 * p.pulse, 0, 7)
          ctx.fill()
        }
        ctx.fillStyle = isStaff ? '#ff8a3d' : '#e9c9b3'
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, 7)
        ctx.fill()
        if (isStaff) {
          ctx.strokeStyle = '#ffd7a0'
          ctx.lineWidth = 1.4
          ctx.beginPath()
          ctx.arc(p.x, p.y, r + 2.4, 0, 7)
          ctx.stroke()
        }
      }
      // labels: biggest first, overlap-culled, up to ~half. Staff only if top3.
      const cands = list
        .filter((p) => (staffSet.has(p.uid) ? top3Set.has(p.uid) : p.deg >= 2))
        .sort((a, b) => b.deg - a.deg)
      const placed: { x: number; y: number; w: number; h: number }[] = []
      const maxLabels = Math.ceil(list.length / 2)
      let shown = 0
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      for (const p of cands) {
        if (shown >= maxLabels) break
        const r = radiusOf(p)
        const fs = Math.round(9 + Math.min(p.deg, 9) * 0.55)
        ctx.font = `bold ${fs}px system-ui, sans-serif`
        const w = ctx.measureText(p.name).width
        const bx = p.x - w / 2 - 3
        const by = p.y + r + 3
        const bw = w + 6
        const bh = fs + 4
        let hit = false
        for (const B of placed) {
          if (bx < B.x + B.w + 2 && bx + bw > B.x - 2 && by < B.y + B.h + 2 && by + bh > B.y - 2) {
            hit = true
            break
          }
        }
        if (hit) continue
        placed.push({ x: bx, y: by, w: bw, h: bh })
        shown++
        ctx.lineWidth = 3.2
        ctx.strokeStyle = 'rgba(10,6,7,.9)'
        ctx.strokeText(p.name, p.x, by)
        ctx.fillStyle = staffSet.has(p.uid)
          ? '#ffd7a0'
          : top3Set.has(p.uid)
            ? '#ffe6a8'
            : 'rgba(246,232,220,.96)'
        ctx.fillText(p.name, p.x, by)
      }
    }

    size()
    step()
    const onResize = () => size()
    window.addEventListener('resize', onResize)
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="block h-full w-full" />
}
