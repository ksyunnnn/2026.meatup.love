// Auth helpers (FR1). Google / GitHub via popup; email = passwordless link.
import {
  signInWithPopup,
  signOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth'
import { auth, googleProvider, githubProvider } from './firebase'

const EMAIL_KEY = 'emailForSignIn'

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider)
}

export function signInWithGithub() {
  return signInWithPopup(auth, githubProvider)
}

export function signOutUser() {
  return signOut(auth)
}

/**
 * Send a passwordless sign-in link. The link returns to the current page
 * (preserving name/token in the query), which completes the sign-in via
 * completeEmailLinkSignIn(). `handleCodeInApp` must be true.
 * The email is stashed locally so same-browser completion needs no re-entry.
 */
export async function sendEmailSignInLink(email: string) {
  const actionCodeSettings = {
    url: window.location.href,
    handleCodeInApp: true,
  }
  await sendSignInLinkToEmail(auth, email, actionCodeSettings)
  window.localStorage.setItem(EMAIL_KEY, email)
}

/**
 * If the current URL is an email sign-in link, finish signing in.
 * Returns true if a sign-in completed. When the link is opened in a different
 * browser/device (e.g. the email app's default browser vs an SNS in-app one),
 * the stored email is absent, so we re-ask — this is the official fallback and
 * is what makes the flow survive browser switches.
 */
export async function completeEmailLinkSignIn(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!isSignInWithEmailLink(auth, window.location.href)) return false

  let email = window.localStorage.getItem(EMAIL_KEY)
  if (!email) {
    email =
      window.prompt('確認のため、リンクを受け取ったメールアドレスを入力してください') ?? ''
  }
  if (!email) return false

  await signInWithEmailLink(auth, email, window.location.href)
  window.localStorage.removeItem(EMAIL_KEY)

  // Strip the Firebase one-time params from the URL but keep name/token.
  const cur = new URLSearchParams(window.location.search)
  const keep = new URLSearchParams()
  const name = cur.get('name')
  const token = cur.get('t')
  if (name) keep.set('name', name)
  if (token) keep.set('t', token)
  const clean = window.location.pathname + (keep.toString() ? `?${keep}` : '')
  window.history.replaceState(null, '', clean)

  return true
}

/**
 * Best-effort detection of SNS in-app browsers (LINE / Instagram / Facebook /
 * X / WeChat). We cannot force the OS to open links in the default browser, so
 * the UI uses this only to *suggest* opening externally.
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Line\/|Instagram|FBAN|FBAV|FB_IAB|Twitter|MicroMessenger/i.test(
    navigator.userAgent,
  )
}
