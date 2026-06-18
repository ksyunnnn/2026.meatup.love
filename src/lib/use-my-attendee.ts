'use client'
// Loads the signed-in user's attendee record. Shared by the functional home
// (/mypage) and the ticket reveal (/ticket) so both gate identically.
import { useEffect, useState } from 'react'
import { useAuth } from './use-auth'
import { getMyAttendee } from './attendees'
import type { Attendee } from './types'

// The Firestore WebChannel connection can stall on first load (iOS Safari /
// proxies), leaving the read pending indefinitely. Bound it so the UI can offer
// a retry instead of spinning forever. A late success still self-heals (below).
const READ_TIMEOUT_MS = 8000

export function useMyAttendee() {
  const { user, loading, error: authError } = useAuth()
  const [attendee, setAttendee] = useState<Attendee | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (loading || !user) return
    let active = true
    const t0 = performance.now()

    const timer = setTimeout(() => {
      if (!active) return
      console.warn(
        `[meatup] attendee read TIMEOUT after ${READ_TIMEOUT_MS}ms — Firestore getDoc still pending (likely WebChannel stall)`,
      )
      setError(new Error('read-timeout'))
    }, READ_TIMEOUT_MS)

    getMyAttendee(user.uid)
      .then((a) => {
        if (!active) return
        clearTimeout(timer)
        console.log(
          `[meatup] attendee read in ${Math.round(performance.now() - t0)}ms (${a ? 'found' : 'none'})`,
        )
        // Self-heal: if a slow read lands after the timeout, clear the error.
        setError(null)
        setAttendee(a)
        setLoaded(true)
      })
      .catch((err) => {
        if (!active) return
        clearTimeout(timer)
        console.warn(
          `[meatup] attendee read error after ${Math.round(performance.now() - t0)}ms`,
          err,
        )
        setError(err as Error)
      })

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [loading, user])

  return { user, loading, attendee, loaded, error: error ?? authError }
}
