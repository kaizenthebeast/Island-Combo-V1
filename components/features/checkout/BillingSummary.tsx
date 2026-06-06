'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleDollarSign } from 'lucide-react'
import PromoCodeForm from '@/components/features/promo/PromoCodeForm'
import { Switch } from '@/components/ui/switch'
import { useCheckoutStore } from '@/lib/store/checkout-store'
import { useCartStore } from '@/lib/store/cart-store'
import { calculateTotals } from '@/lib/checkout/calculate-totals'
import { MIN_REDEEM_POINTS, maxRedeemablePoints } from '@/lib/cart/loyalty-config'
import { customToast } from '@/components/shared/modals/ToastCustom'
import Link from 'next/link'

type Props = {
  totalQty: number
  subtotal: number
}

const BillingSummary = ({ totalQty, subtotal }: Props) => {
  const { promoCode, setPromoCode } = useCheckoutStore()
  const { cart, selectedIds, serverTotals, fetchCart } = useCartStore()

  const [balance, setBalance] = useState<{ points: number; cashValue: number }>({ points: 0, cashValue: 0 })
  const [redeeming, setRedeeming] = useState(false)

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

  // Client preview, used only until the server-side totals arrive.
  const preview = useMemo(
    () => calculateTotals({ subtotal, promoCode: effectivePromoCode, loyaltyDiscount: 0 }),
    [subtotal, effectivePromoCode],
  )

  // Prefer the authoritative server totals (reflect persisted promo + points).
  const promoDiscount   = serverTotals?.promoDiscount  ?? preview.promoDiscount
  const loyaltyDiscount = serverTotals?.pointsDiscount  ?? 0
  const total           = serverTotals?.total ?? preview.total
  const pointsRedeemed  = serverTotals?.pointsRedeemed ?? 0

  // How many points this cart could absorb right now (capped at the post-promo
  // subtotal), bounded by the user's balance.
  const maxPoints = Math.min(balance.points, maxRedeemablePoints(Math.max(0, subtotal - promoDiscount)))
  const canRedeem = maxPoints >= MIN_REDEEM_POINTS

  const onToggleLoyalty = async (checked: boolean) => {
    if (redeeming) return
    setRedeeming(true)
    try {
      if (checked) {
        const res = await fetch('/api/cart/points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: maxPoints }),
        })
        const payload = await res.json()
        if (!res.ok || !payload.success) {
          customToast.warning({ title: 'Could not redeem points', description: payload.message ?? 'Please try again.' })
          return
        }
      } else {
        await fetch('/api/cart/points', { method: 'DELETE' })
      }
      await Promise.all([fetchCart(), loadBalance()])
    } catch {
      customToast.error({ title: 'Loyalty error', description: 'Could not update your points redemption.' })
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
              {canRedeem || pointsRedeemed > 0
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

    </div>
  )
}

export default BillingSummary
