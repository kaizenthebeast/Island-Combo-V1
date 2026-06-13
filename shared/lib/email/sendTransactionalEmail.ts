import 'server-only'

/**
 * Thin wrapper around the `send-email` Edge Function — the one place the app asks
 * for a transactional email. The function (not this app) holds the Resend key and
 * re-derives every fact from trusted DB rows, so callers pass only a record id.
 *
 * Email is ALWAYS best-effort: a Resend/network failure must never break order
 * fulfilment, voucher creation, or a status change. We therefore swallow + log
 * every error and return a boolean the caller is free to ignore. The session
 * client forwards the caller's JWT, which the function uses to authorize the send.
 *
 * Callers should `await` this. Most triggers are server actions, which (unlike
 * route handlers) have no `waitUntil` context — a fire-and-forget promise there
 * can be cut off before the invoke completes. Awaiting guarantees the send runs;
 * the TIMEOUT below caps how long it can ever delay the surrounding action.
 */

import { createClient } from '@/shared/lib/db/server'

export type TransactionalEmail =
  | { type: 'order_update'; orderId: number }
  | { type: 'voucher_issued'; voucherId: string }
  | { type: 'voucher_redeemed'; voucherId: string }

// Hard cap so a hung edge function / Resend call can never block the order,
// voucher, or status-change flow that triggered it.
const TIMEOUT_MS = 10_000

export async function sendTransactionalEmail(payload: TransactionalEmail): Promise<boolean> {
  try {
    const supabase = await createClient()

    const invoke = supabase.functions.invoke('send-email', { body: payload })
    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), TIMEOUT_MS))
    const race = await Promise.race([invoke, timeout])

    if (race === 'timeout') {
      console.error(`[email] ${payload.type} timed out after ${TIMEOUT_MS}ms`)
      return false
    }

    const { data, error } = race
    if (error) {
      console.error(`[email] ${payload.type} invoke failed:`, error.message)
      return false
    }
    // The function returns { ok } even for handled skips (e.g. no recipient/no key).
    if (data && data.ok === false) {
      console.error(`[email] ${payload.type} not sent:`, data.error)
      return false
    }
    return true
  } catch (err) {
    console.error(`[email] ${payload.type} threw:`, err instanceof Error ? err.message : err)
    return false
  }
}
