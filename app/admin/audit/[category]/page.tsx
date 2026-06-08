import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getAuditLogs } from '@/lib/audit'
import { ACTION_OPTIONS, AUDIT_CATEGORIES, isAuditCategory } from '@/lib/audit-config'
import { PageHeader } from '@/components/admin/PageHeader'
import AuditFilters from '@/components/audit/AuditFilters'
import AuditExport from '@/components/audit/AuditExport'
import AuditTable from '@/components/audit/AuditTable'

type SearchParams = Promise<Record<string, string | undefined>>

const LIMIT = 20

// SSR audit view. Data is fetched server-side from `audit_logs` (admin RLS) using
// the filters in searchParams — no client fetch on first render. Changing a filter
// or page pushes new searchParams, which re-runs this Server Component.
export default async function AuditCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>
  searchParams: SearchParams
}) {
  // Layer 2: re-validate admin server-side (proxy.ts is Layer 1).
  const auth = await requireAdmin()
  if (!auth.ok) redirect('/auth/login')

  const { category } = await params
  if (!isAuditCategory(category)) notFound()

  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  const result = await getAuditLogs({
    category,
    page,
    limit: LIMIT,
    from:       sp.from         || undefined,
    to:         sp.to           || undefined,
    action:     sp.action       || undefined,
    actorEmail: sp.actor_email  || undefined,
  })

  const meta       = AUDIT_CATEGORIES.find((c) => c.key === category)!
  const rows       = result.success ? result.data : []
  const total      = result.success ? result.count : 0
  const totalPages = result.success ? result.totalPages : 0

  return (
    <section className="min-h-full bg-muted px-6 py-10">
      <PageHeader eyebrow="Security" title="Audit Log" subtitle={meta.description} />

      {/* Category tabs */}
      <nav className="mb-5 inline-flex flex-wrap gap-1 rounded-xl border border-border bg-white p-1">
        {AUDIT_CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={`/admin/audit/${c.key}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              c.key === category ? 'bg-brand text-white' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      {/* Filters + export */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <AuditFilters category={category} actionOptions={ACTION_OPTIONS[category]} />
        <AuditExport category={category} />
      </div>

      <AuditTable
        category={category}
        rows={rows}
        total={total}
        page={page}
        pageSize={LIMIT}
        totalPages={totalPages}
      />
    </section>
  )
}
