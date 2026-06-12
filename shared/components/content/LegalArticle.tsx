import type { ReactNode } from 'react'
import { CalendarClock } from 'lucide-react'

/**
 * LegalArticle — shared two-column reader layout for policy documents
 * (Terms, Privacy). A sticky, numbered table of contents on the left (desktop)
 * and the document body on the right. Anchor links scroll to each section.
 *
 * Body content is plain JSX; common elements (links, lists, strong) are styled
 * here via descendant utilities so each page only supplies semantic markup.
 */
export type LegalSection = { id: string; title: string; body: ReactNode }

const num = (i: number) => String(i + 1).padStart(2, '0')

export function LegalArticle({
  sections,
  lastUpdated,
  intro,
}: {
  sections: LegalSection[]
  lastUpdated: string
  intro?: ReactNode
}) {
  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Table of contents */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 rounded-2xl border border-border bg-white p-5 shadow-xs">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            On this page
          </p>
          <nav className="flex flex-col gap-0.5">
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="group flex items-baseline gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-brand-tint hover:text-brand"
              >
                <span className="text-xs font-bold text-brand/50 group-hover:text-brand">{num(i)}</span>
                <span className="leading-snug">{s.title}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {/* Document body */}
      <article className="min-w-0">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-surface-soft px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 text-brand" />
          Last updated {lastUpdated}
        </div>

        {intro && (
          <div className="mb-10 rounded-2xl border border-border bg-surface-soft p-5 text-sm leading-relaxed text-foreground/80 sm:p-6">
            {intro}
          </div>
        )}

        <div className="space-y-12">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="flex items-baseline gap-3 text-xl font-bold tracking-tight text-foreground">
                <span className="text-sm font-extrabold text-brand">{num(i)}</span>
                {s.title}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-brand [&_a]:underline [&_li]:marker:text-brand/50 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  )
}

export default LegalArticle
