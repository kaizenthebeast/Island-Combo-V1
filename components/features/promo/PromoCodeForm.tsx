'use client'

import React, { useEffect } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  applyPromoCodeSchema,
  ApplyPromoCodeFormValues,
} from '@/lib/validations/promo-code'
import { useCartStore } from '@/stores/cart-store'
import { customToast } from '@/shared/components/common/modals/ToastCustom'
import type { PromoCode } from '@/shared/types/promo-code'

import { Input } from '@/shared/components/ui/input'
import { AlertCircle } from 'lucide-react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/shared/components/ui/form'

type AppliedPromoCode = Pick<PromoCode, 'code' | 'value'>

type Props = {
  setPromoCode: (promoCode: AppliedPromoCode | null) => void
  activePromoCode: AppliedPromoCode | null
}

const PromoCodeForm = ({ setPromoCode, activePromoCode }: Props) => {
  const { cart, selectedIds, fetchCart } = useCartStore()

  // A promo code can't be combined with wholesale pricing. Block it whenever any
  // selected item is currently getting the wholesale tier.
  const hasWholesale = cart.some(
    (i) => selectedIds.includes(i.variant_id) && i.applied_tier_label === 'wholesale'
  )

  const form = useForm<ApplyPromoCodeFormValues>({
    resolver: zodResolver(applyPromoCodeSchema),
    defaultValues: { promoCode: '' },
  })

  // If an item becomes wholesale-priced after a promo code was applied, drop it
  // (client rule). Also clear the persisted code so server totals agree.
  useEffect(() => {
    if (hasWholesale && activePromoCode) {
      void fetch('/api/cart/discount', { method: 'DELETE' }).then(() => fetchCart())
      setPromoCode(null)
      form.reset()
      customToast.warning({
        title: 'Promo code removed',
        description: 'Promo codes can’t be combined with wholesale-priced items.',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWholesale, activePromoCode])

  // Apply Discount Code: persists to the cart header via the dedicated API and
  // refreshes the cart so the server-side totals reflect the discount.
  const onSubmit: SubmitHandler<ApplyPromoCodeFormValues> = async (data) => {
    if (hasWholesale) {
      customToast.warning({
        title: 'Cannot apply promo code',
        description: 'Discounts can’t be combined with wholesale-priced items.',
      })
      return
    }

    try {
      const res = await fetch('/api/cart/discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: data.promoCode }),
      })
      const payload = await res.json()

      if (!res.ok || !payload.success) {
        setPromoCode(null)
        form.setError('promoCode', { message: payload.message ?? 'Invalid promo code' })
        return
      }

      form.clearErrors('promoCode')
      setPromoCode(payload.data?.promo ?? null)
      await fetchCart()
      form.reset()
    } catch {
      form.setError('promoCode', { message: 'Could not apply promo code. Please try again.' })
    }
  }

  // Remove Discount Code: clears the cart header and recalculates.
  const removePromoCode = async () => {
    try {
      await fetch('/api/cart/discount', { method: 'DELETE' })
    } finally {
      setPromoCode(null)
      await fetchCart()
      form.reset()
    }
  }

  const disabled = !!activePromoCode || hasWholesale

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">Apply Promo Code</h3>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="promoCode"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <div className="flex items-center gap-3">
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Promo code"
                      disabled={disabled}
                      className="flex-1 h-12 bg-white border border-border rounded-lg px-4 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-brand disabled:opacity-50"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="submit"
                    disabled={disabled}
                    className="text-brand font-medium text-sm disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    Apply
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      {/* Wholesale conflict notice */}
      {hasWholesale && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-tint px-3 py-2.5">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-warning font-medium">
            Promo codes can’t be combined with wholesale-priced items.
          </p>
        </div>
      )}

      {/* ACTIVE PROMO CODE */}
      {activePromoCode && !hasWholesale && (
        <div className="rounded-xl border border-success/30 bg-success-tint px-4 py-3 text-sm text-success flex justify-between items-center">
          <div>
            <p className="font-medium">{activePromoCode.code} applied</p>
            <p>{activePromoCode.value}% discount applied</p>
          </div>
          <button
            type="button"
            onClick={removePromoCode}
            className="text-xs text-danger font-medium"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

export default PromoCodeForm
