/**
 * Back-office route RBAC — the single source of truth for which roles may
 * access which /admin sections.
 *
 * Consulted by BOTH enforcement layers so they can never drift apart:
 *   • proxy.ts (middleware) — blocks the request before the page renders
 *   • AppSidebar            — hides nav items the role cannot open
 *
 * It is the ROUTE layer of the defense-in-depth stack only. Every lib function
 * still carries its own requireAdmin/requireStaff guard, and RLS remains the
 * data-level floor — keep the three aligned when adding a section:
 * staff sections must be requireStaff (and is_staff()) all the way down.
 *
 * Pure data + functions: imported from the edge runtime and client components,
 * so no React, icons, or Node APIs here.
 */

export type BackOfficeRole = 'staff' | 'admin'

// Longest matching prefix decides. Any /admin path that matches no prefix is
// admin-only (fail closed) — new sections must opt in to staff access here.
export const ADMIN_SECTIONS: ReadonlyArray<{ prefix: string; minRole: BackOfficeRole }> = [
  // Staff sections — lib guards are requireStaff, RPCs check is_staff().
  { prefix: '/admin/dashboard',           minRole: 'staff' },
  { prefix: '/admin/orders',              minRole: 'staff' },
  { prefix: '/admin/refunds',             minRole: 'staff' },
  { prefix: '/admin/cash-vouchers',       minRole: 'staff' },

  // Admin-only sections — lib guards are requireAdmin/assertAdmin.
  { prefix: '/admin/users',               minRole: 'admin' },
  { prefix: '/admin/products',            minRole: 'admin' },
  { prefix: '/admin/customer-management', minRole: 'admin' },
  { prefix: '/admin/content-management',  minRole: 'admin' },
  { prefix: '/admin/audit',               minRole: 'admin' },
]

const matchesPrefix = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`)

/** May `role` open the back-office route `path`? Admin sees everything; staff
 *  only the sections marked staff; any other role (or none) sees nothing. */
export function canAccessAdminPath(role: string | null | undefined, path: string): boolean {
  if (role === 'admin') return true
  if (role !== 'staff') return false

  const section = ADMIN_SECTIONS
    .filter((s) => matchesPrefix(path, s.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]

  return section?.minRole === 'staff'
}
