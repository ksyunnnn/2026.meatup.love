// Firebase client initialization (modular SDK v12).
// Imported by client components only ("use client").
//
// NOTE: NEXT_PUBLIC_FIREBASE_* values are NOT secrets — they are designed to
// ship to the browser. Access control is enforced by Firestore security rules
// (see firestore.rules), not by hiding these values.
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  connectAuthEmulator,
  type Auth,
} from 'firebase/auth'
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Reuse the same app instance across Fast Refresh / repeated imports.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth: Auth = getAuth(app)
export const db: Firestore = getFirestore(app)

// Auth providers (FR1: Google / GitHub / email link).
export const googleProvider = new GoogleAuthProvider()
export const githubProvider = new GithubAuthProvider()

// Route Auth/Firestore to local emulators when explicitly enabled in dev.
// Guard against duplicate connections during Fast Refresh.
declare global {
  var __MEATUP_FB_EMULATOR__: boolean | undefined
}

if (
  process.env.NEXT_PUBLIC_USE_EMULATOR === 'true' &&
  typeof window !== 'undefined' &&
  !globalThis.__MEATUP_FB_EMULATOR__
) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  globalThis.__MEATUP_FB_EMULATOR__ = true
}

export { app }
