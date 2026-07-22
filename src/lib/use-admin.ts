'use client'
// Admin gate shared by the game's host screens (/live, /control, /admin/specials).
// Mirrors the inline check on /admin: auth first, then a single admins/{uid} get.
import { useEffect, useState } from 'react'
import { useAuth } from './use-auth'
import { isAdmin } from './attendees'

export function useAdmin() {
  const { user, loading, error } = useAuth()
  // The answer is stored with the uid it was fetched for, so a result left over
  // from a previous account can never be read as the current one's.
  const [result, setResult] = useState<{ uid: string; admin: boolean } | null>(null)

  useEffect(() => {
    if (loading || !user) return
    let active = true
    isAdmin(user.uid)
      .then((a) => {
        if (active) setResult({ uid: user.uid, admin: a })
      })
      .catch(() => {
        if (active) setResult({ uid: user.uid, admin: false })
      })
    return () => {
      active = false
    }
  }, [loading, user])

  // Derived during render, not written from the effect: signed-out is already a
  // final answer (not an admin), so it needs no state write of its own.
  const answered = !!user && result?.uid === user.uid
  const admin = answered && result.admin
  const checked = loading ? false : !user || answered

  return { user, loading, admin, checked, error }
}
