import { Suspense } from 'react'
import RegisterClient from './register-client'
import { Loading } from '@/components/load-state'

// useSearchParams() must be wrapped in a Suspense boundary (Next.js requirement).
export default function RegisterPage() {
  return (
    <Suspense
      fallback={<Loading className="flex min-h-dvh items-center justify-center px-4 py-6" />}
    >
      <RegisterClient />
    </Suspense>
  )
}
