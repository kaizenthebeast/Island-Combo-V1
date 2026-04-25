// app/not-found.tsx
import Link from 'next/link'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 – Page Not Found',
  robots: { index: false },
}

export default async function NotFound() {
  const headersList = await headers()
  const pathname = headersList.get('x-invoke-path') ?? '/unknown'

  return (
    <main className="not-found">
      <div className="glow" />
      <div className="grid-overlay" />

      <section>
        <h1>404</h1>
        <div className="divider" />
        <h2>Page not found</h2>
        <p>
          The page you&apos;re looking for doesn&apos;t exist or may have been
          moved. Double-check the URL or head back home.
        </p>
        <code>{pathname}</code>

        <div className="actions">
          <Link href="/" className="btn-primary">← Go home</Link>
          <Link href="/search" className="btn-ghost">Search</Link>
        </div>
      </section>
    </main>
  )
}