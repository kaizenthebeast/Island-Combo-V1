// Client-safe audit config (no server imports) — shared by the SSR pages and the
// client filter/export components. Runtime constants live here instead of in
// lib/audit.ts because that module imports the server-only Supabase client.

import type { AuditCategory, AuditEntityType } from '@/lib/types/audit'

export const AUDIT_CATEGORIES: { key: AuditCategory; label: string; description: string }[] = [
  { key: 'users',    label: 'User Activity',      description: 'Logins, profile changes, and role changes' },
  { key: 'orders',   label: 'Orders',             description: 'Order creation, status changes, cancellations, and refunds' },
  { key: 'products', label: 'Product & Inventory', description: 'Product create/edit/delete, stock adjustments, and price changes' },
  { key: 'payments', label: 'Payments',           description: 'Payment attempts, captures, failures, and refund events' },
  { key: 'admins',   label: 'Admin Actions',      description: 'Any action performed by an admin account' },
]

// Four categories map straight to an entity_type. 'admins' is special — it means
// "any action performed by an admin account" (filtered by actor role).
export const ENTITY_BY_CATEGORY: Record<Exclude<AuditCategory, 'admins'>, AuditEntityType> = {
  users: 'user',
  orders: 'order',
  products: 'product',
  payments: 'payment',
}

export const isAuditCategory = (v: string): v is AuditCategory =>
  AUDIT_CATEGORIES.some((c) => c.key === v)

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
  ],
  payments: [
    { value: 'payment.created',        label: 'Payment created' },
    { value: 'payment.status_changed', label: 'Status changed' },
    { value: 'payment.updated',        label: 'Payment updated' },
    { value: 'payment.deleted',        label: 'Payment deleted' },
  ],
  admins: [], // spans entities — no fixed action list
}
