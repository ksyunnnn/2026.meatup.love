import { Suspense } from 'react'
import InviteClient from './invite-client'
import { Loading } from '@/components/load-state'

// useSearchParams() must be wrapped in a Suspense boundary (Next.js requirement).
export default function InvitePage() {
  return (
    <Suspense
      fallback={<Loading className="flex min-h-dvh items-center justify-center px-4 py-6" />}
    >
      <InviteClient />
    </Suspense>
  )
}
