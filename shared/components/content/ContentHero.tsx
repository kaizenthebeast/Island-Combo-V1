import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/**
 * ContentHero — brand-gradient hero used across the static content pages
 * (About, Terms, Privacy). Mirrors the dashboard WelcomeBanner aesthetic:
 * deep-brand gradient, soft glows, a subtle dot grid, and a centered headline.
 */
type ContentHeroProps = {
  eyebrow: string
  title: string
  description: string
  /** Label for the current page in the breadcrumb (defaults to `title`). */
  breadcrumb?: string
}

export function ContentHero({ eyebrow, title, description, breadcrumb }: ContentHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand to-brand-400 px-6 py-12 text-brand-foreground shadow-sm sm:px-10 sm:py-16">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-10 h-56 w-56 rounded-full bg-accent-2/20 blur-3xl" />
      {/* Subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <nav className="mb-5 flex items-center justify-center gap-1.5 text-xs font-medium text-white/70">
          <Link href="/" className="transition-colors hover:text-white">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-white">{breadcrumb ?? title}</span>
        </nav>

        <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest backdrop-blur-sm">
          {eyebrow}
        </span>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
          {description}
        </p>
      </div>
    </section>
  )
}

export default ContentHero
