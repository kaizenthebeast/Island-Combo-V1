import Link from 'next/link'

// Tab strip switching between the two audit surfaces: Activity (audit_logs —
// who changed what) and Security (security_audit_logs — failed logins,
// rate-limit hits). Server-safe: plain links, active state from the prop.
const TABS = [
  { key: 'activity', label: 'Activity', href: '/admin/audit' },
  { key: 'security', label: 'Security', href: '/admin/audit/security' },
] as const

export type AuditTab = (typeof TABS)[number]['key']

export default function AuditTabs({ active }: { active: AuditTab }) {
  return (
    <nav className="mb-5 inline-flex flex-wrap gap-1 rounded-xl border border-border bg-white p-1">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            t.key === active ? 'bg-brand text-white' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
