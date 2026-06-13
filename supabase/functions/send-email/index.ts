// Supabase Edge Function: send-email
//
// The single outbound channel for transactional email, sent via Resend's REST
// API. Lives here (not in Next) so the RESEND_API_KEY stays a Supabase secret —
// no mail credentials in the app's env. (This replaced an unused SMTP/nodemailer
// placeholder that never sent anything.)
//
// It is NOT an open relay: callers pass only a record id + a `type`, never a
// recipient address or body. The function re-derives every fact (recipient,
// amount, status) from trusted DB rows, read through the CALLER's own scope —
// the purchaser for their voucher, staff for orders/redemptions (RLS + the
// is_staff()-gated admin_get_order RPC). No service-role client is used: this
// project strips default service_role table grants (migrations 0049/0051).
//
//   type: 'order_update'     → emails the customer when staff move an order to a
//                              milestone status.        Caller: staff/admin.
//   type: 'voucher_issued'   → emails the recipient their cash voucher + a QR.
//                              Caller: the voucher's purchaser (or staff).
//   type: 'voucher_redeemed' → emails the "cash claimed" confirmation.
//                              Caller: staff/admin.
//
// Deploy:   supabase functions deploy send-email        (keep verify_jwt ON —
//           only authenticated users can invoke; we additionally authorize each type.)
// Secrets:  supabase secrets set RESEND_API_KEY=re_... \
//             RESEND_FROM='Island Combo <onboarding@resend.dev>'   (optional) \
//             SITE_URL=https://island-combo.onrender.com           (optional)
//           SUPABASE_URL / SUPABASE_ANON_KEY are injected by the platform.
//           Until RESEND_API_KEY is set the function is a safe no-op (like loyverse-sync).
//
// Outcome convention (mirrors invite-user): business outcomes — sent, or a handled
// skip like "no recipient on file" — return HTTP 200 with { ok }. Non-2xx is
// reserved for auth/input/system errors so the caller can log + move on.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import QRCode from 'npm:qrcode@1.5.4'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const FROM = Deno.env.get('RESEND_FROM') ?? 'Island Combo <onboarding@resend.dev>'
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://island-combo.onrender.com').replace(/\/+$/, '')

const BRAND = '#900036'
const TINT = '#fff0f4'

// ── helpers ──────────────────────────────────────────────────────────────────

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

const money = (n: unknown) =>
  `$${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Friendly, customer-facing copy for each order status.
const STATUS_COPY: Record<string, { label: string; line: string }> = {
  shipped:          { label: 'Shipped',          line: 'Your order is on its way.' },
  out_for_delivery: { label: 'Out for delivery', line: 'Your order is out for delivery and arriving soon.' },
  delivered:        { label: 'Delivered',        line: 'Your order has been delivered. Enjoy!' },
  completed:        { label: 'Completed',        line: 'Your order is complete. Thank you for shopping with us!' },
  cancelled:        { label: 'Cancelled',        line: 'Your order has been cancelled. If this is unexpected, please contact us.' },
}

// Shared branded shell so every email looks consistent.
const layout = (heading: string, inner: string) => `
<div style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:${BRAND};color:#ffffff;padding:20px 24px;">
      <div style="font-size:18px;font-weight:700;">Island Combo</div>
    </div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 12px;font-size:20px;">${esc(heading)}</h1>
      ${inner}
    </div>
    <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
      This is an automated message from Island Combo. Please do not reply.
    </div>
  </div>
</div>`

const button = (href: string, label: string) => `
<a href="${esc(href)}" style="display:inline-block;margin-top:8px;background:${BRAND};color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:9999px;font-size:14px;font-weight:600;">${esc(label)}</a>`

// ── Resend ───────────────────────────────────────────────────────────────────

type Attachment = { filename: string; content: string; content_type?: string; content_id?: string }

async function sendViaResend(args: {
  to: string
  subject: string
  html: string
  attachments?: Attachment[]
}): Promise<{ id?: string; skipped?: string }> {
  const key = Deno.env.get('RESEND_API_KEY')
  // No key configured yet → safe no-op so the surrounding flow still succeeds.
  if (!key) return { skipped: 'no RESEND_API_KEY' }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      attachments: args.attachments,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`)
  }
  const data = await res.json().catch(() => ({}))
  return { id: data?.id }
}

// ── email builders ─────────────────────────────────────────────────────────

function orderUpdateEmail(
  order: { order_status: string; public_ref: string; total_amount: number | null },
  name: string | null,
): { subject: string; html: string } {
  const copy = STATUS_COPY[order.order_status] ?? {
    label: order.order_status,
    line: `Your order status is now "${order.order_status}".`,
  }
  const ref = String(order.public_ref ?? '').slice(0, 8).toUpperCase()
  const hello = name ? `Hi ${esc(name)},` : 'Hi,'

  const inner = `
    <p style="margin:0 0 12px;">${hello}</p>
    <p style="margin:0 0 16px;">${esc(copy.line)}</p>
    <div style="background:${TINT};border-radius:12px;padding:16px;margin:0 0 16px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="color:#6b7280;padding:4px 0;">Order ref</td><td style="text-align:right;font-weight:700;">${esc(ref)}</td></tr>
        <tr><td style="color:#6b7280;padding:4px 0;">Status</td><td style="text-align:right;font-weight:700;">${esc(copy.label)}</td></tr>
        ${order.total_amount != null ? `<tr><td style="color:#6b7280;padding:4px 0;">Total</td><td style="text-align:right;font-weight:700;">${money(order.total_amount)}</td></tr>` : ''}
      </table>
    </div>
    ${button(`${SITE_URL}/account`, 'View your orders')}`

  return { subject: `Your Island Combo order is ${copy.label}`, html: layout(`Order ${copy.label}`, inner) }
}

function voucherIssuedEmail(v: {
  code: string
  amount: number
  recipient_name: string
}): { subject: string; html: string } {
  const inner = `
    <p style="margin:0 0 4px;">Hi ${esc(v.recipient_name)},</p>
    <p style="margin:0 0 16px;">You've received an Island Combo cash voucher, redeemable as cash in store.</p>

    <div style="background:${BRAND};color:#ffffff;border-radius:12px;padding:16px 20px;text-align:center;margin:0 0 16px;">
      <div style="font-size:12px;opacity:.9;">Redeemable as cash in store</div>
      <div style="font-size:30px;font-weight:800;margin-top:4px;">${money(v.amount)}</div>
    </div>

    <div style="text-align:center;margin:0 0 16px;">
      <img src="cid:voucher-qr" alt="Voucher QR code" width="200" height="200" style="display:inline-block;border:1px solid #e5e7eb;border-radius:8px;" />
      <div style="margin-top:8px;font-size:13px;color:#6b7280;">Voucher code</div>
      <div style="font-size:16px;font-weight:700;letter-spacing:.5px;">${esc(v.code)}</div>
    </div>

    <div style="background:${TINT};border-radius:12px;padding:16px;font-size:13px;color:#374151;">
      <strong>How to claim:</strong> Bring a valid ID matching the recipient name to the Island Combo
      store and present this QR code (or the voucher code above) at the counter. Cash is released
      instantly once verified.
    </div>`

  return {
    subject: `Your Island Combo cash voucher (${money(v.amount)})`,
    html: layout('Your cash voucher', inner),
  }
}

function voucherRedeemedEmail(v: {
  code: string
  amount: number
  recipient_name: string
  redeemed_recipient_name: string | null
  claimed_at: string | null
}): { subject: string; html: string } {
  const when = v.claimed_at
    ? new Date(v.claimed_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : null

  const inner = `
    <p style="margin:0 0 4px;">Hi ${esc(v.recipient_name)},</p>
    <p style="margin:0 0 16px;">Your Island Combo cash voucher has been successfully claimed in store.</p>
    <div style="background:${TINT};border-radius:12px;padding:16px;margin:0 0 8px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="color:#6b7280;padding:4px 0;">Voucher</td><td style="text-align:right;font-weight:700;">${esc(v.code)}</td></tr>
        <tr><td style="color:#6b7280;padding:4px 0;">Amount</td><td style="text-align:right;font-weight:700;">${money(v.amount)}</td></tr>
        ${v.redeemed_recipient_name ? `<tr><td style="color:#6b7280;padding:4px 0;">Claimed by</td><td style="text-align:right;font-weight:700;">${esc(v.redeemed_recipient_name)}</td></tr>` : ''}
        ${when ? `<tr><td style="color:#6b7280;padding:4px 0;">When</td><td style="text-align:right;font-weight:700;">${esc(when)}</td></tr>` : ''}
      </table>
    </div>
    <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">If you did not claim this voucher, please contact us immediately.</p>`

  return { subject: 'Your Island Combo voucher was claimed', html: layout('Cash claimed', inner) }
}

// ── handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ ok: false, error: 'unauthorized' }, 401)

  // Caller-scoped client (RLS applies). This is the ONLY client we use: every
  // caller is exactly the party RLS already authorizes to read what their email
  // needs — the purchaser reads their own voucher, staff read any voucher, and the
  // order detail comes from the is_staff()-gated admin_get_order RPC. We do NOT
  // use a service-role client: this project strips default service_role table
  // grants (migrations 0049/0051), so it can't read these tables anyway.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ ok: false, error: 'unauthorized' }, 401)

  const isStaff = async (): Promise<boolean> => {
    const { data } = await userClient
      .from('profile').select('role, is_active').eq('user_id', user.id).maybeSingle()
    return !!data && data.is_active === true && (data.role === 'admin' || data.role === 'staff')
  }

  const body = await req.json().catch(() => ({}))
  const type = body?.type

  try {
    // ORDER UPDATE — staff/admin only; emails the customer on the order. The
    // order header + customer email come from the existing admin_get_order RPC
    // (SECURITY DEFINER, is_staff()-gated), which returns them together.
    if (type === 'order_update') {
      if (!(await isStaff())) return json({ ok: false, error: 'forbidden: staff access required' }, 403)

      const orderId = Number(body.orderId)
      if (!Number.isFinite(orderId)) return json({ ok: false, error: 'orderId required' }, 400)

      const { data: detail, error } = await userClient.rpc('admin_get_order', { p_order_id: orderId })
      if (error) return json({ ok: false, error: error.message }, 502)
      if (!detail?.order) return json({ ok: false, error: 'order not found' }, 404)

      const to = detail.customer?.email
      if (!to) return json({ ok: true, skipped: 'no recipient' })

      const { subject, html } = orderUpdateEmail(detail.order, detail.customer?.name ?? null)
      const result = await sendViaResend({ to, subject, html })
      return json({ ok: true, type, ...result })
    }

    // VOUCHER ISSUED / REDEEMED — both keyed on a voucher id.
    if (type === 'voucher_issued' || type === 'voucher_redeemed') {
      const voucherId = body.voucherId
      if (typeof voucherId !== 'string' || !voucherId) {
        return json({ ok: false, error: 'voucherId required' }, 400)
      }

      // voucher_redeemed is staff-only; voucher_issued is for the purchaser.
      if (type === 'voucher_redeemed' && !(await isStaff())) {
        return json({ ok: false, error: 'forbidden: staff access required' }, 403)
      }

      // Read through the caller's own visibility: cash_voucher RLS returns the row
      // only to its purchaser or to staff. A null row therefore means the caller
      // isn't allowed to see it (issued ⇒ 403) or it doesn't exist (redeemed,
      // already staff-gated ⇒ 404). No service-role read (grants are stripped).
      const { data: voucher } = await userClient
        .from('cash_voucher')
        .select('id, code, amount, recipient_name, recipient_email, purchaser_email, redemption_uuid, redeemed_recipient_name, claimed_at')
        .eq('id', voucherId)
        .maybeSingle()
      if (!voucher) {
        return type === 'voucher_issued'
          ? json({ ok: false, error: 'forbidden' }, 403)
          : json({ ok: false, error: 'voucher not found' }, 404)
      }

      const to = voucher.recipient_email ?? voucher.purchaser_email
      if (!to) return json({ ok: true, skipped: 'no recipient' })

      if (type === 'voucher_issued') {
        // QR encodes the canonical redemption id (what validate/redeem expect),
        // falling back to the display code. Attached inline and referenced via cid.
        const qrValue = voucher.redemption_uuid ?? voucher.code
        const dataUrl = await QRCode.toDataURL(qrValue, { width: 240, margin: 1 })
        const base64 = String(dataUrl).split(',')[1] ?? ''

        const { subject, html } = voucherIssuedEmail(voucher)
        const result = await sendViaResend({
          to,
          subject,
          html,
          attachments: [{
            filename: `voucher-${voucher.code}.png`,
            content: base64,
            content_type: 'image/png',
            content_id: 'voucher-qr',
          }],
        })
        return json({ ok: true, type, ...result })
      }

      const { subject, html } = voucherRedeemedEmail(voucher)
      const result = await sendViaResend({ to, subject, html })
      return json({ ok: true, type, ...result })
    }

    return json({ ok: false, error: `unknown type: ${String(type)}` }, 400)
  } catch (err) {
    // System/Resend failure — non-2xx so the caller logs it. The caller treats
    // email as non-fatal, so the underlying action still succeeds.
    return json({ ok: false, error: err instanceof Error ? err.message : 'send failed' }, 502)
  }
})
