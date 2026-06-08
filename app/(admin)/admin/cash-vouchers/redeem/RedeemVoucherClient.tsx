'use client'

import { useState, useTransition, type ComponentType } from 'react'
import { Search, ShieldCheck, BadgeCheck, AlertCircle, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import StatusBadge, { BadgeVariant } from '@/components/admin/StatusBadge'
import { findCashVoucherByCode, redeemCashVoucher } from '@/lib/admin/cash-vouchers'
import type { CashVoucher, CashVoucherStatus } from '@/shared/types/cash-voucher'

// status → badge styling
const STATUS_BADGE: Record<CashVoucherStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE:    { label: 'Active',    variant: 'success' },
  REDEEMED:  { label: 'Redeemed',  variant: 'info'    },
  CANCELLED: { label: 'Cancelled', variant: 'danger'  },
  EXPIRED:   { label: 'Expired',   variant: 'warning' },
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const formatDateTime = (iso: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// The team's QR scanner plugs in here: a component that calls `onScan(code)` with
// the decoded voucher code. Left optional so manual entry works without it.
export type VoucherScanner = ComponentType<{ onScan: (code: string) => void }>

export default function RedeemVoucherClient(
  { ScannerComponent }: { ScannerComponent?: VoucherScanner } = {},
) {
  // search
  const [codeInput, setCodeInput] = useState('')
  const [voucher, setVoucher] = useState<CashVoucher | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searching, startSearch] = useTransition()

  // redemption
  const [redeemerName, setRedeemerName] = useState('')
  const [idVerified, setIdVerified] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeeming, startRedeem] = useTransition()
  const [justRedeemed, setJustRedeemed] = useState(false)

  const resetResult = () => {
    setVoucher(null)
    setSearchError(null)
    setRedeemError(null)
    setRedeemerName('')
    setIdVerified(false)
    setJustRedeemed(false)
  }

  // Single lookup path used by both the manual form and the QR scanner.
  const runSearch = (rawCode: string) => {
    const code = rawCode.trim()
    if (!code) return
    setSearchError(null)
    setRedeemError(null)
    setVoucher(null)
    setJustRedeemed(false)
    startSearch(async () => {
      const res = await findCashVoucherByCode(code)
      if (!res.success || !res.voucher) {
        setSearchError(res.message ?? 'Voucher not found.')
        return
      }
      setVoucher(res.voucher)
      // Prefill the redeemer with the intended recipient; staff edits to match the ID.
      setRedeemerName(res.voucher.recipient_name ?? '')
      setIdVerified(false)
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    runSearch(codeInput)
  }

  // ── QR scanner integration point ────────────────────────────────────────────
  // The team's QR scanner only needs to call this with the decoded value: it
  // mirrors the field and runs the same lookup the manual form does. Pass the
  // scanner in via the `ScannerComponent` prop (it's rendered in the slot below).
  const handleScannedCode = (code: string) => {
    setCodeInput(code)
    runSearch(code)
  }

  const handleRedeem = () => {
    if (!voucher) return
    setRedeemError(null)
    startRedeem(async () => {
      const res = await redeemCashVoucher(voucher.code, redeemerName)
      if (!res.success || !res.voucher) {
        setRedeemError(res.message ?? 'Could not redeem the voucher.')
        return
      }
      setVoucher(res.voucher)
      setJustRedeemed(true)
    })
  }

  const badge = voucher ? STATUS_BADGE[voucher.status] : null
  const canRedeem = voucher?.status === 'ACTIVE'

  return (
    <section className="min-h-full bg-muted px-6 py-10">
      <PageHeader
        eyebrow="Cash Vouchers"
        title="Redeem Voucher"
        subtitle="Verify a digital voucher and release the cash to the recipient"
      />

      <div className="mx-auto max-w-xl">
        {/* Verification Tool: scan/enter the unique voucher code */}
        <form
          onSubmit={handleSearch}
          className="rounded-2xl border border-border bg-white p-5 shadow-sm"
        >
          <label htmlFor="voucher-code" className="text-sm font-semibold text-foreground">
            Voucher code
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Scan the QR code or type the unique voucher code (e.g. CV-2026-XXXXXXXXXX).
          </p>
          <div className="mt-3 flex gap-2">
            <input
              id="voucher-code"
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="CV-2026-XXXXXXXXXX"
              autoComplete="off"
              className="flex-1 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-mono uppercase tracking-wide outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={searching || !codeInput.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search size={15} />
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>

          {/* QR scanner slot — the team's scanner renders here and calls
              handleScannedCode(code) on a successful decode. */}
          {ScannerComponent && (
            <div className="mt-3">
              <ScannerComponent onScan={handleScannedCode} />
            </div>
          )}

          {searchError && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-tint px-3 py-2">
              <AlertCircle size={15} className="text-danger" />
              <p className="text-xs font-medium text-danger">{searchError}</p>
            </div>
          )}
        </form>

        {/* Voucher detail + Safety Check + Manual Redemption */}
        {voucher && badge && (
          <div className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold tracking-wide">{voucher.code}</span>
              <StatusBadge status={badge.label} variant={badge.variant} />
            </div>

            {/* Safety Check: value in large text */}
            <div className="mt-5 rounded-xl bg-brand-tint px-6 py-7 text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-brand/80">
                Cash value to release
              </p>
              <p className="mt-1 text-5xl font-extrabold text-brand">{money(voucher.amount)}</p>
            </div>

            {/* Voucher facts */}
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Intended recipient</dt>
                <dd className="font-medium text-foreground">{voucher.recipient_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Purchased by</dt>
                <dd className="font-medium text-foreground">{voucher.purchaser_email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Purchase date</dt>
                <dd className="font-medium text-foreground">{formatDateTime(voucher.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Recipient email</dt>
                <dd className="font-medium text-foreground">{voucher.recipient_email || '—'}</dd>
              </div>
            </dl>

            {/* ACTIVE → show the manual redemption form */}
            {canRedeem && (
              <div className="mt-6 border-t border-border pt-6">
                <label htmlFor="redeemer" className="text-sm font-semibold text-foreground">
                  Person exchanging the voucher
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Enter the name exactly as shown on the ID they present.
                </p>
                <input
                  id="redeemer"
                  type="text"
                  value={redeemerName}
                  onChange={(e) => setRedeemerName(e.target.value)}
                  placeholder="Full name on ID"
                  className="mt-3 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                />

                <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={idVerified}
                    onChange={(e) => setIdVerified(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-brand"
                  />
                  <span className="text-foreground">
                    I have verified the recipient&apos;s identity against a valid ID.
                  </span>
                </label>

                {redeemError && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-tint px-3 py-2">
                    <AlertCircle size={15} className="text-danger" />
                    <p className="text-xs font-medium text-danger">{redeemError}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRedeem}
                  disabled={redeeming || !idVerified || !redeemerName.trim()}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShieldCheck size={16} />
                  {redeeming ? 'Releasing cash…' : 'Confirm Identity & Release Cash'}
                </button>
              </div>
            )}

            {/* Already REDEEMED → show the audit record (immutable) */}
            {voucher.status === 'REDEEMED' && (
              <div className="mt-6 border-t border-border pt-6">
                {justRedeemed && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success-tint px-3 py-2.5">
                    <BadgeCheck size={16} className="text-success" />
                    <p className="text-sm font-semibold text-success-text">
                      Cash released. This voucher is now redeemed.
                    </p>
                  </div>
                )}
                <h3 className="text-sm font-semibold text-foreground">Redemption record</h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Exchanged by</dt>
                    <dd className="font-medium text-foreground">{voucher.redeemed_recipient_name || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Redeemed at</dt>
                    <dd className="font-medium text-foreground">{formatDateTime(voucher.claimed_at)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Released by (staff ID)</dt>
                    <dd className="font-mono text-xs text-foreground">{voucher.claimed_by || '—'}</dd>
                  </div>
                </dl>
              </div>
            )}

            {/* CANCELLED / EXPIRED → not redeemable */}
            {(voucher.status === 'CANCELLED' || voucher.status === 'EXPIRED') && (
              <div className="mt-6 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-tint px-3 py-2.5">
                <AlertCircle size={16} className="text-warning-text" />
                <p className="text-sm font-medium text-warning-text">
                  This voucher is {badge.label.toLowerCase()} and cannot be redeemed.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={resetResult}
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <RotateCcw size={13} />
              Look up another voucher
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
