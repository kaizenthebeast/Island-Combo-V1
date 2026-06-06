'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store/cart-store'
import { useCheckoutStore } from '@/lib/store/checkout-store'
import { calculateTotals } from '@/lib/checkout/calculate-totals'
import { customToast } from '@/components/shared/modals/ToastCustom'
import type { ProductCheckoutIntent } from '@/lib/types/order'

const AddressBillingSummary = () => {
  const router = useRouter()
  const { totalQty, subtotal, cart, selectedIds, serverTotals } = useCartStore()
  const {
    promoCode,
    loyaltyEnabled,
    shippingFee,
    shippingMethod,
    paymentMethod,
    fulfillment,
    selectedAddressId,
    placing,
    submitCard,
    setPlacing,
    resetCheckout,
  } = useCheckoutStore()

  // Promo codes can't combine with wholesale pricing.
  const hasWholesale = cart.some(
    (i) => selectedIds.includes(i.variant_id) && i.applied_tier_label === 'wholesale'
  )

  // Loyalty discount comes from the authoritative server totals (persisted points
  // redemption on the cart), not a client guess.
  const loyaltyDiscount = serverTotals?.pointsDiscount ?? 0
  const { promoDiscount, total } = calculateTotals({
    subtotal,
    promoCode: hasWholesale ? null : promoCode,
    loyaltyDiscount,
    shippingFee: shippingFee ?? 0,
  })

  const buildIntent = (): ProductCheckoutIntent => ({
    kind: 'product',
    selectedVariantIds: selectedIds,
    fulfillment,
    shippingAddressId: fulfillment === 'deliver' ? selectedAddressId : null,
    paymentMethod,
    promoCode: promoCode?.code ?? null,
    useLoyalty: loyaltyEnabled,
  })

  // COD places the order directly. Card delegates to the in-provider PayPal card
  // submit registered by CardPaymentFields (the money moves there, then capture).
  const handlePlaceOrder = async () => {
    if (placing) return

    if (selectedIds.length === 0) {
      customToast.error({ title: 'No items selected', description: 'Select at least one item to check out.' })
      return
    }
    if (fulfillment === 'deliver' && !selectedAddressId) {
      customToast.error({ title: 'Delivery address required', description: 'Please select a delivery address to continue.' })
      return
    }

    if (paymentMethod === 'card') {
      if (!submitCard) {
        customToast.error({ title: 'Card form not ready', description: 'Please wait a moment for the card form to load and try again.' })
        return
      }
      await submitCard()
      return
    }

    // Cash on delivery.
    setPlacing(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'create', intent: buildIntent() }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? 'Could not place your order.')

      const orderRef = json.data?.order?.public_ref
      // Re-sync from the server (create_order removed only the ordered lines) so
      // any unselected items — and the cart count — stay correct.
      await useCartStore.getState().fetchCart()
      resetCheckout()
      router.push(`/checkout/success${orderRef ? `?order=${orderRef}` : ''}`)
    } catch (error) {
      customToast.error({
        title: 'Order failed',
        description: error instanceof Error ? error.message : 'Something went wrong placing your order.',
      })
      setPlacing(false)
    }
  }

  return (
    <div className="w-full md:w-[350px]">
      <div className="bg-surface-soft p-5 rounded-xl space-y-4 sticky top-4">
        <h2 className="font-semibold">Order Summary</h2>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal ({totalQty} items)</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Discount</span>
          <span className="text-success">-${promoDiscount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Loyalty points</span>
          <span>-${loyaltyDiscount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Shipping fee{shippingMethod ? ` (${shippingMethod})` : ""}</span>
          <span>
            {shippingFee !== null ? `$${shippingFee.toFixed(2)}` : "Pending"}
          </span>
        </div>
        <div className="border-t pt-3 flex justify-between font-semibold">
          <span>Total</span>
          <span className="text-brand">${total.toFixed(2)}</span>
        </div>
        <button
          type='button'
          onClick={handlePlaceOrder}
          disabled={placing || selectedIds.length === 0}
          className="w-full bg-brand text-white py-3 rounded-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {placing ? 'Placing order…' : 'Place Order'}
        </button>
      </div>
    </div>
  )
}

export default AddressBillingSummary
