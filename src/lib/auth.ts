// Auth helpers (FR1). Google / GitHub via popup; email link is added later.
import { signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider, githubProvider } from './firebase'

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider)
}

export function signInWithGithub() {
  return signInWithPopup(auth, githubProvider)
}

export function signOutUser() {
  return signOut(auth)
}
