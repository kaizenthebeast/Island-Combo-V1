'use client'

import React, { useEffect } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  applyPromoCodeSchema,
  ApplyPromoCodeFormValues,
} from '@/lib/validators/promo-code'
import { applyPromoCode } from '@/lib/promotional-codes/apply-promo-code'
import { useCartStore } from '@/lib/store/cart-store'
import { customToast } from '@/components/shared/modals/ToastCustom'
import type { PromoCode } from '@/lib/types/promo-code'

import { Input } from '@/components/ui/input'
import { AlertCircle } from 'lucide-react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'

type AppliedPromoCode = Pick<PromoCode, 'code' | 'value'>

type Props = {
  setPromoCode: (promoCode: AppliedPromoCode | null) => void
  activePromoCode: AppliedPromoCode | null
}

const PromoCodeForm = ({ setPromoCode, activePromoCode }: Props) => {
  const { totalQty, cart, selectedIds } = useCartStore()

  // A promo code can't be combined with wholesale pricing. Block it whenever any
  // selected item is currently getting the wholesale tier.
  const hasWholesale = cart.some(
    (i) => selectedIds.includes(i.variant_id) && i.applied_tier_label === 'wholesale'
  )

  const form = useForm<ApplyPromoCodeFormValues>({
    resolver: zodResolver(applyPromoCodeSchema),
    defaultValues: { promoCode: '' },
  })

  // If an item becomes wholesale-priced after a promo code was applied, drop it.
  useEffect(() => {
    if (hasWholesale && activePromoCode) {
      setPromoCode(null)
      form.reset()
      customToast.warning({
        title: 'Promo code removed',
        description: 'Promo codes can’t be combined with wholesale-priced items.',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWholesale, activePromoCode])

  const onSubmit: SubmitHandler<ApplyPromoCodeFormValues> = async (data) => {
    if (hasWholesale) {
      customToast.warning({
        title: 'Cannot apply promo code',
        description: 'Discounts can’t be combined with wholesale-priced items.',
      })
      return
    }

    const result = await applyPromoCode(data.promoCode, totalQty)

    if (!result.success) {
      setPromoCode(null)
      form.setError('promoCode', {
        message: result.message ?? 'Invalid promo code',
      })
      return
    }

    form.clearErrors('promoCode')
    setPromoCode(result.promoCode ?? null)
    form.reset()
  }

  const removePromoCode = () => {
    setPromoCode(null)
    form.reset()
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
