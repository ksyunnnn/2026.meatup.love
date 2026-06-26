'use client'

import { useEffect, useRef, useState } from 'react'
import { buildTicketShareText, pickTagline, ticketOgImageUrl, ticketShareUrl } from './share'

// Compose the 9:16 (1080×1920) story image in the browser: the landscape ticket
// PNG drawn centered on a full cream canvas, so it fills an Instagram story
// instead of sitting letterboxed in the middle. Done client-side on purpose —
// rendering 1080×1920 on the edge trips Cloudflare's Worker CPU limit (1102),
// whereas a single canvas draw here is cheap and full-resolution.
const STORY_W = 1080
const STORY_H = 1920
const CREAM = '#fff7ef' // --color-cream

async function toStoryBlob(landscape: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(landscape)
  const canvas = document.createElement('canvas')
  canvas.width = STORY_W
  canvas.height = STORY_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, STORY_W, STORY_H)
  // Fit to width, center vertically. The landscape already carries cream side
  // margins, so the card lands with breathing room on all four sides.
  const h = (bmp.height / bmp.width) * STORY_W
  ctx.drawImage(bmp, 0, (STORY_H - h) / 2, STORY_W, h)
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  )
}

// Fetch the ticket PNG and compose it into a story-shaped File. Same-origin, so
// no CORS / canvas taint. Returns null if the render isn't ready or we're
// offline; falls back to the raw landscape image if compositing is unavailable.
async function fetchTicketImage(uid: string, ticketNo?: string): Promise<File | null> {
  try {
    const res = await fetch(ticketOgImageUrl(window.location.origin, uid, ticketNo))
    if (!res.ok) return null
    const blob = await res.blob()
    try {
      const story = await toStoryBlob(blob)
      return new File([story], 'meatup2026-ticket.png', { type: 'image/png' })
    } catch {
      return new File([blob], 'meatup2026-ticket.png', { type: 'image/png' })
    }
  } catch {
    return null
  }
}

// Shared "share my ticket" actions for both /ticket and the registration
// completion screen, so the wording (tagline + participation line + single
// ticket URL) stays identical in one place. Two paths on purpose:
//  - shareLink:  the url as text → X/LINE render the rich OGP card.
//  - shareImage: the OGP png as a file → can be added to a story as an image.
export function useTicketShare(uid?: string, ticketNo?: string) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Pre-fetch the image BEFORE the tap. iOS Safari's navigator.share() requires
  // the click's transient activation; awaiting a fetch inside the handler can
  // let that activation lapse → NotAllowedError. Having the File ready up front
  // means the click can share synchronously.
  const imageFile = useRef<File | null>(null)
  useEffect(() => {
    let alive = true
    if (uid) {
      fetchTicketImage(uid, ticketNo).then((f) => {
        if (alive) imageFile.current = f
      })
    }
    return () => {
      alive = false
      if (timer.current) clearTimeout(timer.current)
    }
  }, [uid, ticketNo])

  function buildText(): string {
    const url = ticketShareUrl(window.location.origin, uid!, ticketNo)
    return buildTicketShareText(pickTagline(), url)
  }

  // Share the url as text. iOS Safari quirk: passing BOTH text and url drops the
  // url, so we embed the url in the text and pass a single field — it always
  // rides. No native share sheet (desktop) → copy to clipboard.
  async function shareLink() {
    if (!uid) return
    const text = buildText()
    if (navigator.share) {
      try {
        await navigator.share({ title: 'meatup 2026', text })
      } catch {
        /* user cancelled */
      }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  // Share the ticket AS AN IMAGE (so it can be added to a story). text rides
  // along for targets that keep it; the url also survives via the QR baked into
  // the image. Falls back to the link share when files can't be shared.
  async function shareImage() {
    if (!uid) return
    const file = imageFile.current
    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: buildText() })
      } catch {
        /* user cancelled */
      }
      return
    }
    await shareLink()
  }

  return { shareLink, shareImage, copied }
}
