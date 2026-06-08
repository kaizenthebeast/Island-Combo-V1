import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'

// Audit index. Layer 1 (proxy.ts) already blocked non-admins; this is the Layer 2
// server-side re-check before sending the admin to the first category.
export default async function AuditIndexPage() {
  const auth = await requireAdmin()
  if (!auth.ok) redirect('/auth/login')
  redirect('/admin/audit/users')
}
