import Link from 'next/link'

// Global 404 — App Router special file. Rendered for unmatched routes and any
// notFound() call that isn't caught by a closer not-found boundary.
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand">404</p>
      <h1 className="text-3xl font-bold text-foreground">Page not found</h1>
      <p className="max-w-md text-muted-foreground">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Back to home
      </Link>
    </div>
  )
}
