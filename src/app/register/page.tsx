import { Suspense } from 'react'
import RegisterClient from './register-client'

// useSearchParams() must be wrapped in a Suspense boundary (Next.js requirement).
export default function RegisterPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>読み込み中…</main>}>
      <RegisterClient />
    </Suspense>
  )
}
