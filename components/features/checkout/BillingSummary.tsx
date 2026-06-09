'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { CircleDollarSign } from 'lucide-react'
import PromoCodeForm from '@/features/promotions/components/PromoCodeForm'
import { Switch } from '@/shared/components/ui/switch'
import { Input } from '@/shared/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import { useCheckoutStore } from '@/features/checkout/stores/checkout-store'
import { useCartStore } from '@/features/cart/stores/cart-store'
import { MIN_REDEEM_POINTS, maxRedeemablePoints, pointsToCash } from '@/features/cart/api/loyalty-config'
import { customToast } from '@/shared/components/common/modals/ToastCustom'
import Link from 'next/link'

type Props = {
  totalQty: number
  subtotal: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

const BillingSummary = ({ totalQty, subtotal }: Props) => {
  const { promoCode, setPromoCode } = useCheckoutStore()
  const { cart, selectedIds, serverTotals, fetchCart } = useCartStore()

  const [balance, setBalance] = useState<{ points: number; cashValue: number }>({ points: 0, cashValue: 0 })
  const [redeeming, setRedeeming] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [sheetError, setSheetError] = useState<string | null>(null)

  // Load the loyalty balance so we know how many points can be redeemed.
  const loadBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/loyalty')
      const payload = await res.json()
      if (res.ok && payload.success) {
        setBalance({ points: payload.data.points ?? 0, cashValue: payload.data.cashValue ?? 0 })
      }
    } catch {
      /* non-fatal: loyalty just stays unavailable */
    }
  }, [])
  useEffect(() => { loadBalance() }, [loadBalance])

  // Promo codes can't combine with wholesale pricing.
  const hasWholesale = cart.some(
    (i) => selectedIds.includes(i.variant_id) && i.applied_tier_label === 'wholesale'
  )
  const effectivePromoCode = hasWholesale ? null : promoCode

  // Totals are recomputed from the LIVE selected subtotal so they react instantly
  // to quantity/selection changes. The promo % comes from the applied code; the
  // points held come from the server cart (cart_meta), capped at this subtotal —
  // exactly how checkout will charge.
  const pointsRedeemed = serverTotals?.pointsRedeemed ?? 0
  const promoDiscount = effectivePromoCode ? round2((subtotal * effectivePromoCode.value) / 100) : 0
  const loyaltyDiscount = round2(Math.min(pointsToCash(pointsRedeemed), Math.max(0, subtotal - promoDiscount)))
  const total = round2(Math.max(0, subtotal - promoDiscount - loyaltyDiscount))

  // Points this order can absorb right now (≥ the minimum, ≤ balance, ≤ subtotal).
  const maxPoints = Math.min(balance.points, maxRedeemablePoints(Math.max(0, subtotal - promoDiscount)))
  const canRedeem = maxPoints >= MIN_REDEEM_POINTS

  // Switch ON → open the sheet to pick an amount; OFF → remove the redemption.
  const onToggleLoyalty = async (checked: boolean) => {
    if (redeeming) return
    if (checked) {
      setSheetError(null)
      setAmount(canRedeem ? String(maxPoints) : '')
      setSheetOpen(true)
      return
    }
    setRedeeming(true)
    try {
      await fetch('/api/cart/points', { method: 'DELETE' })
      await Promise.all([fetchCart(), loadBalance()])
    } catch {
      customToast.error({ title: 'Loyalty error', description: 'Could not remove your points redemption.' })
    } finally {
      setRedeeming(false)
    }
  }

  const handleApply = async () => {
    const pts = Math.floor(Number(amount))
    if (!Number.isFinite(pts) || pts <= 0) {
      setSheetError('Enter how many points to redeem.')
      return
    }
    setRedeeming(true)
    setSheetError(null)
    try {
      const res = await fetch('/api/cart/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: pts }),
      })
      const payload = await res.json()
      if (!res.ok || !payload.success) {
        setSheetError(payload.message ?? 'Could not redeem points.')
        return
      }
      await Promise.all([fetchCart(), loadBalance()])
      setSheetOpen(false)
      setAmount('')
    } catch {
      setSheetError('Could not redeem points. Please try again.')
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <div className="bg-surface-soft rounded-2xl p-5 space-y-6">

      {/* PROMO CODE */}
      <PromoCodeForm
        setPromoCode={setPromoCode}
        activePromoCode={promoCode}
      />

      {/* LOYALTY */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-warning-tint p-2 rounded-full">
            <CircleDollarSign className="text-warning" size={18} />
          </div>
          <div>
            <p className="text-sm font-medium">
              {balance.points.toLocaleString()} Loyalty Points (${balance.cashValue.toFixed(2)})
            </p>
            <p className="text-xs text-brand">
              {pointsRedeemed > 0
                ? `${pointsRedeemed.toLocaleString()} points applied`
                : canRedeem
                  ? 'Redeem points for a discount'
                  : `Need at least ${MIN_REDEEM_POINTS} points to redeem`}
            </p>
          </div>
        </div>
        <Switch
          checked={pointsRedeemed > 0}
          onCheckedChange={onToggleLoyalty}
          disabled={redeeming || (pointsRedeemed === 0 && !canRedeem)}
        />
      </div>

      <hr />

      {/* SUMMARY */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Order Summary</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-foreground">
            <span>Subtotal ({totalQty} items)</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-success">
            <span>Discount</span>
            <span>- ${promoDiscount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-success">
            <span>Loyalty points{pointsRedeemed > 0 ? ` (${pointsRedeemed.toLocaleString()})` : ''}</span>
            <span>- ${loyaltyDiscount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-muted-foreground">
            <span>Shipping fee</span>
            <span>Calculated at checkout</span>
          </div>
        </div>

        <hr />

        {/* TOTAL */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-2xl font-bold text-foreground">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* CHECKOUT */}
      {totalQty > 0 ? (
        <Link
          href="/checkout/address"
          className="w-full bg-brand text-white py-3 rounded-full font-medium hover:opacity-90 transition text-center inline-block"
        >
          Checkout
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="w-full bg-brand/40 text-white py-3 rounded-full font-medium text-center cursor-not-allowed"
        >
          Checkout
        </button>
      )}

      {/* LOYALTY REDEMPTION SHEET */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-sm">
          <SheetHeader className="border-b border-border">
            <SheetTitle className="text-center text-lg">Use Loyalty Points</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 p-5">
            {/* Balance */}
            <div className="flex items-center gap-3 rounded-xl bg-warning-tint p-4">
              <div className="rounded-full bg-white/70 p-2">
                <CircleDollarSign className="text-warning" size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Loyalty Points</p>
                <p className="text-xl font-bold text-brand">
                  {balance.points.toLocaleString()} ≈ ${balance.cashValue.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label htmlFor="redeem-points" className="text-sm font-semibold">
                How much you want to redeem?
              </label>
              <Input
                id="redeem-points"
                type="number"
                inputMode="numeric"
                min={MIN_REDEEM_POINTS}
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setSheetError(null) }}
                placeholder="Loyalty points"
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">
                Min {MIN_REDEEM_POINTS} points
                {canRedeem ? ` · up to ${maxPoints.toLocaleString()} for this order` : ''}.
              </p>
              {sheetError && <p className="text-xs text-danger">{sheetError}</p>}
            </div>

            <button
              type="button"
              onClick={handleApply}
              disabled={redeeming}
              className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {redeeming ? 'Applying…' : 'Apply'}
            </button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  )
}

export default BillingSummary
