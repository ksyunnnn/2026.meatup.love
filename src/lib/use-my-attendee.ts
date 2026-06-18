'use client'
// Loads the signed-in user's attendee record. Shared by the functional home
// (/mypage) and the ticket reveal (/ticket) so both gate identically.
import { useEffect, useState } from 'react'
import { useAuth } from './use-auth'
import { getMyAttendee } from './attendees'
import type { Attendee } from './types'

export function useMyAttendee() {
  const { user, loading } = useAuth()
  const [attendee, setAttendee] = useState<Attendee | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    let active = true
    getMyAttendee(user.uid).then((a) => {
      if (!active) return
      setAttendee(a)
      setLoaded(true)
    })
    return () => {
      active = false
    }
  }, [loading, user])

  return { user, loading, attendee, loaded }
}
