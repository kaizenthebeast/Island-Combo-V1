// Global loading UI — App Router special file. Shown as a Suspense fallback
// while a segment streams in.
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
    </div>
  )
}
