'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './firebase'

// iOS Safari can hang Firebase Auth's IndexedDB session restore so the first
// onAuthStateChanged callback never fires — leaving the page spinning forever.
// Bound the wait: after this, surface an error so the UI can offer a retry.
const AUTH_TIMEOUT_MS = 8000

/**
 * Subscribe to Firebase Auth state. `loading` is true until the first callback.
 * `error` is set if the subscription errors OR never fires within the timeout
 * (so callers can show a retry instead of an indefinite spinner).
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const t0 = performance.now()
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      console.warn(
        `[meatup] auth TIMEOUT after ${AUTH_TIMEOUT_MS}ms — onAuthStateChanged never fired (likely iOS Safari IndexedDB stall)`,
      )
      setError(new Error('auth-timeout'))
      setLoading(false)
    }, AUTH_TIMEOUT_MS)

    const unsubscribe = onAuthStateChanged(
      auth,
      (u) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        setUser(u)
        setLoading(false)
      },
      (err) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        console.warn(
          `[meatup] auth error after ${Math.round(performance.now() - t0)}ms`,
          err,
        )
        setError(err as Error)
        setLoading(false)
      },
    )

    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [])

  return { user, loading, error }
}
