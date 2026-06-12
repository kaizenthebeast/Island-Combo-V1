// Client-safe audit config (no server imports) — shared by the SSR pages and the
// client filter/export components. Runtime constants live here instead of in
// lib/audit.ts because that module imports the server-only Supabase client.

import type { AuditCategory, AuditEntityType, SecurityEventType } from '@/shared/types/audit'

export const AUDIT_CATEGORIES: { key: AuditCategory; label: string; description: string }[] = [
  { key: 'users',    label: 'User Activity',      description: 'Staff edits to user profiles and role changes' },
  { key: 'orders',   label: 'Orders',             description: 'Order status changes, cancellations, and refunds by staff' },
  { key: 'products', label: 'Product & Inventory', description: 'Product & category create/edit/delete, stock adjustments, and price changes' },
  { key: 'payments', label: 'Payments',           description: 'Payment record changes made by staff' },
  { key: 'vouchers', label: 'Cash Vouchers',      description: 'Voucher redemptions and status changes by staff' },
  { key: 'loyalty',  label: 'Loyalty Points',     description: 'Point balance changes made by staff (adjustments, accruals, restitutions)' },
  { key: 'admins',   label: 'Admin Actions',      description: 'Any action performed by an admin account' },
]

// Most categories map to one or more entity_types ('products' spans product AND
// category rows). 'admins' is special — it means "any action performed by an
// admin account" (filtered by actor role).
export const ENTITY_BY_CATEGORY: Record<Exclude<AuditCategory, 'admins'>, AuditEntityType[]> = {
  users: ['user'],
  orders: ['order'],
  products: ['product', 'category'],
  payments: ['payment'],
  vouchers: ['voucher'],
  loyalty: ['loyalty'],
}

export const isAuditCategory = (v: string): v is AuditCategory =>
  AUDIT_CATEGORIES.some((c) => c.key === v)

// Options for the unified page's "Type" filter — the categories plus an
// all-types default ('' = no filter).
export const AUDIT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All types' },
  ...AUDIT_CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
]

// Action options for the per-category filter dropdown.
export const ACTION_OPTIONS: Record<AuditCategory, { value: string; label: string }[]> = {
  users: [
    { value: 'user.created',      label: 'User created' },
    { value: 'user.updated',      label: 'Profile updated' },
    { value: 'user.role_changed', label: 'Role changed' },
    { value: 'user.deleted',      label: 'User deleted' },
    { value: 'user.login',        label: 'Login' },
    { value: 'user.logout',       label: 'Logout' },
  ],
  orders: [
    { value: 'order.created',        label: 'Order created' },
    { value: 'order.status_changed', label: 'Status changed' },
    { value: 'order.updated',        label: 'Order updated' },
    { value: 'order.deleted',        label: 'Order deleted' },
  ],
  products: [
    { value: 'product.created',       label: 'Product created' },
    { value: 'product.updated',       label: 'Product updated' },
    { value: 'product.stock_changed', label: 'Stock changed' },
    { value: 'product.price_changed', label: 'Price changed' },
    { value: 'product.deleted',       label: 'Product deleted' },
    { value: 'category.created',      label: 'Category created' },
    { value: 'category.updated',      label: 'Category updated' },
    { value: 'category.deleted',      label: 'Category deleted' },
  ],
  payments: [
    { value: 'payment.created',        label: 'Payment created' },
    { value: 'payment.status_changed', label: 'Status changed' },
    { value: 'payment.updated',        label: 'Payment updated' },
    { value: 'payment.deleted',        label: 'Payment deleted' },
  ],
  vouchers: [
    { value: 'voucher.redeemed',       label: 'Voucher redeemed' },
    { value: 'voucher.status_changed', label: 'Status changed' },
    { value: 'voucher.updated',        label: 'Voucher updated' },
  ],
  loyalty: [
    { value: 'loyalty.points_changed', label: 'Points changed' },
    { value: 'loyalty.updated',        label: 'Loyalty record updated' },
  ],
  admins: [], // spans entities — no fixed action list
}

// Grouped action options for the unified filter's "All types" state — every
// concrete action, labelled by its category so duplicate labels (e.g. two
// "Status changed") stay distinguishable in the dropdown.
export const ACTION_OPTION_GROUPS: { label: string; options: { value: string; label: string }[] }[] =
  AUDIT_CATEGORIES
    .filter((c) => ACTION_OPTIONS[c.key].length > 0)
    .map((c) => ({ label: c.label, options: ACTION_OPTIONS[c.key] }))

// ── Security audit (client-safe) ──────────────────────────────────────────────
export const SECURITY_EVENT_LABEL: Record<SecurityEventType, string> = {
  rate_limit_exceeded: 'Rate limit exceeded',
  login_failed:        'Failed login',
}

// Options for the security page's "Event" filter ('' = all events).
export const SECURITY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All events' },
  { value: 'rate_limit_exceeded', label: SECURITY_EVENT_LABEL.rate_limit_exceeded },
  { value: 'login_failed',        label: SECURITY_EVENT_LABEL.login_failed },
]

export const isSecurityEventType = (v: string): v is SecurityEventType =>
  v === 'rate_limit_exceeded' || v === 'login_failed'
