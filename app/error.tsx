'use client'

import { useEffect } from 'react'

// Global error boundary — App Router special file. Catches runtime errors in the
// app tree (the existing app/global-error.tsx still handles root-layout errors).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-danger">Error</p>
      <h1 className="text-3xl font-bold text-foreground">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Try again
      </button>
    </div>
  )
}
