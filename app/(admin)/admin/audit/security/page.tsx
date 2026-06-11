import { redirect } from 'next/navigation'
import { requireAdmin } from '@/features/auth/api'
import { getSecurityAuditLogs } from '@/features/audit/api/security'
import { isSecurityEventType } from '@/features/audit/api/audit-config'
import { PageHeader } from '@/shared/components/admin/PageHeader'
import AuditTabs from '@/features/audit/components/AuditTabs'
import SecurityAuditFilters from '@/features/audit/components/SecurityAuditFilters'
import SecurityAuditExport from '@/features/audit/components/SecurityAuditExport'
import SecurityAuditTable from '@/features/audit/components/SecurityAuditTable'

type SearchParams = Promise<Record<string, string | undefined>>

const LIMIT = 20

// SSR security audit view over the append-only `security_audit_logs` table:
// failed login attempts and API rate-limit hits, written exclusively by the
// SECURITY DEFINER log_security_event RPC. Read-only by design — the table
// rejects UPDATE/DELETE at the database level.
export default async function SecurityAuditPage({ searchParams }: { searchParams: SearchParams }) {
  // Layer 2: re-validate admin server-side (proxy.ts is Layer 1).
  const auth = await requireAdmin()
  if (!auth.ok) redirect('/auth/login')

  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const eventType = sp.event && isSecurityEventType(sp.event) ? sp.event : undefined

  const result = await getSecurityAuditLogs({
    eventType,
    page,
    limit:  LIMIT,
    from:   sp.from   || undefined,
    to:     sp.to     || undefined,
    search: sp.search || undefined,
  })

  const rows       = result.success ? result.data : []
  const total      = result.success ? result.count : 0
  const totalPages = result.success ? result.totalPages : 0

  return (
    <section className="min-h-full bg-muted px-6 py-10">
      <PageHeader
        eyebrow="Security"
        title="Audit Log"
        subtitle="Failed login attempts and API rate-limit violations"
      />

      <AuditTabs active="security" />

      {/* Filters + export. The key remounts the filters from the URL whenever
          the active filters change, so inputs stay in sync without an effect. */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <SecurityAuditFilters
          key={`${sp.event ?? ''}|${sp.from ?? ''}|${sp.to ?? ''}|${sp.search ?? ''}`}
        />
        <SecurityAuditExport />
      </div>

      <SecurityAuditTable
        rows={rows}
        total={total}
        page={page}
        pageSize={LIMIT}
        totalPages={totalPages}
      />
    </section>
  )
}
