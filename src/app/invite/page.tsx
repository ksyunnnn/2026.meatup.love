import { Suspense } from 'react'
import InviteClient from './invite-client'

// useSearchParams() must be wrapped in a Suspense boundary (Next.js requirement).
export default function InvitePage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>読み込み中…</main>}>
      <InviteClient />
    </Suspense>
  )
}
