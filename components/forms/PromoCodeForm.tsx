'use client'

import React, { useEffect } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  applyVoucherSchema,
  ApplyVoucherFormValues,
} from '@/lib/validators/voucher'
import { applyVoucher } from '@/lib/promo-vouchers/apply-voucher'
import { useCartStore } from '@/lib/store/cart-store'
import { customToast } from '@/components/popup/ToastCustom'
import type { Voucher } from '@/lib/types/voucher'

import { Input } from '@/components/ui/input'
import { AlertCircle } from 'lucide-react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'

type AppliedVoucher = Pick<Voucher, 'code' | 'value'>

type Props = {
  setVoucher: (voucher: AppliedVoucher | null) => void
  activeVoucher: AppliedVoucher | null
}

const VoucherCodeForm = ({ setVoucher, activeVoucher }: Props) => {
  const { totalQty, cart, selectedIds } = useCartStore()

  // A voucher can't be combined with wholesale pricing. Block it whenever any
  // selected item is currently getting the wholesale tier.
  const hasWholesale = cart.some(
    (i) => selectedIds.includes(i.variant_id) && i.applied_tier_label === 'wholesale'
  )

  const form = useForm<ApplyVoucherFormValues>({
    resolver: zodResolver(applyVoucherSchema),
    defaultValues: { voucherCode: '' },
  })

  // If an item becomes wholesale-priced after a voucher was applied, drop it.
  useEffect(() => {
    if (hasWholesale && activeVoucher) {
      setVoucher(null)
      form.reset()
      customToast.warning({
        title: 'Voucher removed',
        description: 'Discount vouchers can’t be combined with wholesale-priced items.',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWholesale, activeVoucher])

  const onSubmit: SubmitHandler<ApplyVoucherFormValues> = async (data) => {
    if (hasWholesale) {
      customToast.warning({
        title: 'Cannot apply voucher',
        description: 'Discounts can’t be combined with wholesale-priced items.',
      })
      return
    }

    const result = await applyVoucher(data.voucherCode, totalQty)

    if (!result.success) {
      setVoucher(null)
      form.setError('voucherCode', {
        message: result.message ?? 'Invalid voucher code',
      })
      return
    }

    form.clearErrors('voucherCode')
    setVoucher(result.voucher ?? null)
    form.reset()
  }

  const removeVoucher = () => {
    setVoucher(null)
    form.reset()
  }

  const disabled = !!activeVoucher || hasWholesale

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">Apply Promo Code</h3>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="voucherCode"
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
            Discount vouchers can’t be combined with wholesale-priced items.
          </p>
        </div>
      )}

      {/* ACTIVE VOUCHER */}
      {activeVoucher && !hasWholesale && (
        <div className="rounded-xl border border-success/30 bg-success-tint px-4 py-3 text-sm text-success flex justify-between items-center">
          <div>
            <p className="font-medium">{activeVoucher.code} applied</p>
            <p>{activeVoucher.value}% discount applied</p>
          </div>
          <button
            type="button"
            onClick={removeVoucher}
            className="text-xs text-danger font-medium"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

export default VoucherCodeForm
