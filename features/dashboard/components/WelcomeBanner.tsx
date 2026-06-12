'use client'
/**
 * WelcomeBanner — brand-themed hero greeting for the admin dashboard.
 *
 * The greeting and date are derived from the admin's *local* time rather than
 * the server's. We read the clock through `useSyncExternalStore`: the server
 * snapshot is `null` (neutral "Welcome back"), so SSR and the hydration render
 * match exactly — React then swaps in the live, minute-ticking client value with
 * no hydration mismatch and no setState-in-effect.
 */
import { useSyncExternalStore } from 'react'

type Highlight = { label: string; value: string }

// Tick once a minute — enough to keep the greeting/date honest if the tab is
// left open across a boundary (e.g. midnight, or morning → afternoon).
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000)
  return () => clearInterval(id)
}
// Snapshot is the current minute index — referentially stable between ticks, as
// useSyncExternalStore requires.
const clientMinute = () => Math.floor(Date.now() / 60_000)
const serverMinute = () => null

function useLocalNow(): Date | null {
  const minute = useSyncExternalStore(subscribe, clientMinute, serverMinute)
  return minute === null ? null : new Date(minute * 60_000)
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function WelcomeBanner({ name, highlights = [] }: { name: string; highlights?: Highlight[] }) {
  const now = useLocalNow()

  const greeting = now ? greetingFor(now.getHours()) : 'Welcome back'
  const dateLabel = now
    ? now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand to-brand-400 px-5 py-6 text-brand-foreground shadow-sm sm:px-8 sm:py-8">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-32 h-44 w-44 rounded-full bg-accent-2/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Greeting */}
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-white/70" suppressHydrationWarning>
            {dateLabel || ' '}
          </p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl" suppressHydrationWarning>
            {greeting}, {name} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/80">
            Here&apos;s what&apos;s happening with your store today. Keep up the great work.
          </p>
        </div>

        {/* Quick highlights */}
        {highlights.length > 0 && (
          <div className="grid shrink-0 grid-cols-3 gap-3 sm:gap-4">
            {highlights.map((h) => (
              <div
                key={h.label}
                className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm sm:px-4 sm:py-3"
              >
                <p className="text-lg font-extrabold leading-tight sm:text-xl">{h.value}</p>
                <p className="mt-0.5 whitespace-nowrap text-[11px] font-medium text-white/70">{h.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default WelcomeBanner
