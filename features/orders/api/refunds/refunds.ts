'use server'
/** Admin refund queue — list refund requests and approve/reject them.
 *  Staff-gated here (fast 403) and inside process_order_refund (is_staff). */

import { createClient } from '@/shared/lib/db/server'
import { requireStaff } from '@/features/auth/api'
import { verifyCurrentUserPassword } from '@/features/auth/api/reauth'
import { revalidatePath } from 'next/cache'
import type { AdminRefundRow, RefundStatus } from '@/shared/types/refund'

const firstOf = <T>(x: T | T[] | null | undefined): T | null =>
  Array.isArray(x) ? (x[0] ?? null) : (x ?? null)

export const getRefunds = async (
  status?: RefundStatus | 'all',
): Promise<{ success: true; rows: AdminRefundRow[] } | { success: false; status: number; message: string }> => {
  const auth = await requireStaff()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const supabase = await createClient()
  let query = supabase
    .from('refunds')
    .select(
      'id, order_id, amount, reason, status, paypal_capture_id, paypal_refund_id, staff_note, requested_at, processed_at, processed_by, media_paths, orders(public_ref, payment_method, user_id)',
    )
    .order('requested_at', { ascending: false })
  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return { success: false, status: 400, message: error.message }

  type Raw = {
    id: number; order_id: number; amount: number; reason: string | null; status: RefundStatus
    paypal_capture_id: string | null; paypal_refund_id: string | null; staff_note: string | null
    requested_at: string; processed_at: string | null; processed_by: string | null; media_paths: string[] | null
    orders: { public_ref: string; payment_method: string; user_id: string } | null
  }
  const raw = (data ?? []) as unknown as Raw[]

  // Resolve the (private) refund evidence to short-lived signed URLs in one batch.
  const allPaths = [...new Set(raw.flatMap((r) => r.media_paths ?? []))]
  const signedByPath = new Map<string, string>()
  if (allPaths.length) {
    const { data: signed } = await supabase.storage.from('refund-media').createSignedUrls(allPaths, 60 * 30)
    for (const s of signed ?? []) if (s.signedUrl && s.path) signedByPath.set(s.path, s.signedUrl)
  }
  const isVideo = (p: string) => /\.(mp4|mov|webm|quicktime)$/i.test(p)

  // Resolve names for both the customer (order owner) and the staff who processed
  // it — admin RLS lets these through. One profile query covers both (audit).
  const ids = new Set<string>()
  for (const r of raw) {
    const o = firstOf(r.orders)
    if (o?.user_id) ids.add(o.user_id)
    if (r.processed_by) ids.add(r.processed_by)
  }
  const byId = new Map<string, { name: string | null; email: string | null }>()
  if (ids.size) {
    const { data: profs } = await supabase
      .from('profile')
      .select('user_id, first_name, last_name, email')
      .in('user_id', [...ids])
    for (const p of profs ?? [])
      byId.set(p.user_id, { name: [p.first_name, p.last_name].filter(Boolean).join(' ') || null, email: p.email })
  }

  const rows: AdminRefundRow[] = raw.map((r) => {
    const o = firstOf(r.orders)
    const c = o ? byId.get(o.user_id) : undefined
    return {
      id: Number(r.id),
      order_id: Number(r.order_id),
      public_ref: o?.public_ref ?? '',
      customer_name: c?.name ?? null,
      customer_email: c?.email ?? null,
      amount: Number(r.amount),
      reason: r.reason,
      status: r.status,
      payment_method: o?.payment_method ?? '',
      paypal_capture_id: r.paypal_capture_id,
      paypal_refund_id: r.paypal_refund_id,
      staff_note: r.staff_note,
      requested_at: r.requested_at,
      processed_at: r.processed_at,
      processed_by_name: r.processed_by ? byId.get(r.processed_by)?.name ?? null : null,
      media: (r.media_paths ?? [])
        .map((p) => ({ url: signedByPath.get(p) ?? '', isVideo: isVideo(p) }))
        .filter((m) => m.url),
    }
  })
  return { success: true, rows }
}

export const processRefund = async (
  refundId: number,
  action: 'approve' | 'reject',
  opts: { note?: string; password?: string } = {},
): Promise<{ success: true; message: string } | { success: false; status: number; message: string }> => {
  const auth = await requireStaff()
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message }

  const supabase = await createClient()

  if (action === 'reject') {
    const { error } = await supabase.rpc('process_order_refund', {
      p_refund_id: refundId, p_action: 'reject', p_paypal_refund_id: null, p_note: opts.note?.trim() || null,
    })
    if (error) return { success: false, status: 400, message: error.message }
    revalidatePath('/admin/refunds')
    return { success: true, message: 'Refund request rejected.' }
  }

  // ── Approve: step-up 2FA before any money moves ──────────────────────────────
  if (!opts.password?.trim()) {
    return { success: false, status: 400, message: 'Enter your password to approve the refund.' }
  }
  const verified = await verifyCurrentUserPassword(opts.password)
  if (!verified) {
    return { success: false, status: 401, message: 'Incorrect password — refund not processed.' }
  }

  // Load the pending request (capture id + amount).
  const { data: refund, error: rErr } = await supabase
    .from('refunds').select('status, amount, paypal_capture_id').eq('id', refundId).single()
  if (rErr || !refund) return { success: false, status: 404, message: 'Refund request not found.' }
  if (refund.status !== 'pending') return { success: false, status: 400, message: 'This refund has already been processed.' }
  if (!refund.paypal_capture_id) return { success: false, status: 400, message: 'No PayPal capture is linked to this refund.' }

  // Issue the actual PayPal refund via the edge function (carries the staff JWT).
  const { data: pp, error: ppErr } = await supabase.functions.invoke('paypal-refund', {
    body: { capture_id: refund.paypal_capture_id, amount: refund.amount, currency: 'USD' },
  })
  if (ppErr) return { success: false, status: 502, message: `PayPal refund failed: ${ppErr.message}` }
  const result = (pp ?? {}) as { ok?: boolean; refund_id?: string; status?: string; error?: string }
  if (!result.ok) return { success: false, status: 502, message: `PayPal refund failed: ${result.error ?? 'unknown error'}` }

  // Commit the DB side: cancel the order, restore stock/points, mark refunded with
  // the PayPal refund id. The RPC logs the acting staff to transaction_event; the
  // staff_note carries the 2FA confirmation for the audit trail.
  const note = [opts.note?.trim(), '2FA-confirmed'].filter(Boolean).join(' · ')
  const { error: procErr } = await supabase.rpc('process_order_refund', {
    p_refund_id: refundId, p_action: 'approve', p_paypal_refund_id: result.refund_id ?? null, p_note: note,
  })
  if (procErr) return { success: false, status: 400, message: procErr.message }

  revalidatePath('/admin/refunds')
  return { success: true, message: `Refund issued via PayPal (${result.status ?? 'COMPLETED'}) — order cancelled.` }
}
