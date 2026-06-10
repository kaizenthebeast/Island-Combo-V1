/** Environment-variable assertion helper. */
// Asserts a required environment variable is set, throwing a clear error if not.
// Pass the value via a literal `process.env.X` reference (not dynamic lookup) so
// Next.js can still inline NEXT_PUBLIC_ vars into the client bundle at build time.
export function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

// The app's public base origin (e.g. https://island-combo.onrender.com) — the
// single source of truth for every absolute URL we build, server- or client-side:
// SEO/OpenGraph metadata, auth email redirect links, OAuth redirects. Set
// NEXT_PUBLIC_SITE_URL per environment; falls back to localhost for local dev.
// The literal process.env reference lets Next inline it into the client bundle.
// Trailing slash trimmed so `${getSiteUrl()}/path` never double-slashes.
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
}
