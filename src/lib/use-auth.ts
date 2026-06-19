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
    // Guards ONLY the timeout vs. the first callback — it must NOT stop later
    // callbacks from updating state. onAuthStateChanged is a subscription: a
    // sign-in that completes after the initial callback (email-link completion),
    // a sign-out, or an account switch all fire again and must reflect without a
    // reload. (The previous one-shot guard swallowed those = the stuck-on-/invite
    // bug, fixed only by reload.)
    let firstFired = false

    const timer = setTimeout(() => {
      if (firstFired) return
      firstFired = true
      console.warn(
        `[meatup] auth TIMEOUT after ${AUTH_TIMEOUT_MS}ms — onAuthStateChanged never fired (likely iOS Safari IndexedDB stall)`,
      )
      setError(new Error('auth-timeout'))
      setLoading(false)
    }, AUTH_TIMEOUT_MS)

    const unsubscribe = onAuthStateChanged(
      auth,
      (u) => {
        firstFired = true
        clearTimeout(timer)
        setError(null) // self-heal if a late callback lands after the timeout
        setUser(u)
        setLoading(false)
      },
      (err) => {
        firstFired = true
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
