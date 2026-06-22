'use client'

import { useEffect, useRef, useState } from 'react'
import { buildTicketShareText, pickTagline, ticketShareUrl } from './share'

// Shared "share my ticket" action for both /ticket and the registration
// completion screen, so the wording (tagline + participation line + single
// ticket URL) stays identical in one place.
export function useTicketShare(uid?: string, ticketNo?: string) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  async function share() {
    if (!uid) return
    const url = ticketShareUrl(window.location.origin, uid, ticketNo)
    const text = buildTicketShareText(pickTagline(), url)
    // iOS Safari Web Share quirk: passing BOTH text and url drops the url, so we
    // embed the url in the text and pass a single field — the url always rides.
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

  return { share, copied }
}
