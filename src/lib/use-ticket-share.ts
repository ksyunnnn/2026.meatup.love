'use client'

import { useEffect, useRef, useState } from 'react'
import { buildTicketShareText, pickTagline, ticketOgImageUrl, ticketShareUrl } from './share'

// Fetch the rendered ticket OGP PNG (1200×630) as a File so it can ride in a
// Web Share payload — this is what lets the ticket be added to a story as an
// image. Same-origin, so no CORS. Returns null if the render isn't ready or
// we're offline, so the caller falls back to a plain url/text share.
async function fetchTicketImage(uid: string, ticketNo?: string): Promise<File | null> {
  try {
    const res = await fetch(ticketOgImageUrl(window.location.origin, uid, ticketNo))
    if (!res.ok) return null
    const blob = await res.blob()
    return new File([blob], 'meatup2026-ticket.png', { type: 'image/png' })
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
