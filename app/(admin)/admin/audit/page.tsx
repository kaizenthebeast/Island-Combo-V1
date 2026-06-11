import { redirect } from 'next/navigation'
import { requireAdmin } from '@/features/auth/api'
import { getAuditLogs } from '@/features/audit/api/audit'
import { isAuditCategory } from '@/features/audit/api/audit-config'
import { PageHeader } from '@/shared/components/admin/PageHeader'
import AuditTabs from '@/features/audit/components/AuditTabs'
import AuditFilters from '@/features/audit/components/AuditFilters'
import AuditExport from '@/features/audit/components/AuditExport'
import AuditTable from '@/features/audit/components/AuditTable'

type SearchParams = Promise<Record<string, string | undefined>>

const LIMIT = 20

// Single SSR audit view. Data is fetched server-side from `audit_logs` (admin
// RLS) using the filters in searchParams — no client fetch on first render.
// Changing a filter or page pushes new searchParams, which re-runs this Server
// Component. The optional `type` filter narrows to one entity category; unset,
// it shows every audit entry.
export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  // Layer 2: re-validate admin server-side (proxy.ts is Layer 1).
  const auth = await requireAdmin()
  if (!auth.ok) redirect('/auth/login')

  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const type = sp.type && isAuditCategory(sp.type) ? sp.type : undefined

  const result = await getAuditLogs({
    category:   type,
    page,
    limit:      LIMIT,
    from:       sp.from         || undefined,
    to:         sp.to           || undefined,
    action:     sp.action       || undefined,
    actorEmail: sp.actor_email  || undefined,
  })

  const rows       = result.success ? result.data : []
  const total      = result.success ? result.count : 0
  const totalPages = result.success ? result.totalPages : 0

  return (
    <section className="min-h-full bg-muted px-6 py-10">
      <PageHeader
        eyebrow="Security"
        title="Audit Log"
        subtitle="Every recorded action across users, orders, products, and payments"
      />

      <AuditTabs active="activity" />

      {/* Filters + export. The key remounts AuditFilters from the URL whenever
          the active filters change, so its inputs stay in sync without an effect. */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <AuditFilters
          key={`${sp.type ?? ''}|${sp.from ?? ''}|${sp.to ?? ''}|${sp.action ?? ''}|${sp.actor_email ?? ''}`}
        />
        <AuditExport />
      </div>

      <AuditTable
        rows={rows}
        total={total}
        page={page}
        pageSize={LIMIT}
        totalPages={totalPages}
      />
    </section>
  )
}
