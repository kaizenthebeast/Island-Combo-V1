// Asserts a required environment variable is set, throwing a clear error if not.
// Pass the value via a literal `process.env.X` reference (not dynamic lookup) so
// Next.js can still inline NEXT_PUBLIC_ vars into the client bundle at build time.
export function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}
