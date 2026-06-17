'use client'

// Pinned invitation-card red frame that tracks the *visual* viewport via the
// Visual Viewport API. On iOS Safari a plain position:fixed; inset:0 frame
// anchors to the LAYOUT viewport, so when the toolbar hides on scroll the frame
// stops short of the real visible bottom and content leaks below it. Here we
// size/offset the frame to window.visualViewport on every resize/scroll, so the
// border always hugs the actually-visible edges and stays pinned. Pre-JS it
// falls back to 100svh (fits with the toolbar shown → never leaks initially).
import { useEffect, useRef } from 'react'

export function ViewportFrame() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    const vv = window.visualViewport
    if (!el || !vv) return
    const sync = () => {
      el.style.width = `${vv.width}px`
      el.style.height = `${vv.height}px`
      el.style.transform = `translate(${vv.offsetLeft}px, ${vv.offsetTop}px)`
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-50 border-[12px] border-meat"
      style={{ width: '100vw', height: '100svh' }}
    />
  )
}
