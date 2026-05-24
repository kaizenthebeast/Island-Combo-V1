'use client'

import React from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  applyVoucherSchema,
  ApplyVoucherFormValues,
} from '@/form-schema/voucherSchema'
import { applyVoucher } from '@/lib/voucher'
import { useCartStore } from '@/store/cartStore'
import type { Voucher } from '@/types/voucher'

import { Input } from '@/components/ui/input'
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
  const { totalQty } = useCartStore()

  const form = useForm<ApplyVoucherFormValues>({
    resolver: zodResolver(applyVoucherSchema),
    defaultValues: { voucherCode: '' },
  })

  const onSubmit: SubmitHandler<ApplyVoucherFormValues> = async (data) => {
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

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">Apply Voucher Code</h3>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex items-start gap-3"
        >
          <FormField
            control={form.control}
            name="voucherCode"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Voucher code"
                    disabled={!!activeVoucher}
                    className="bg-transparent border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#900036] disabled:opacity-50"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <button
            type="submit"
            disabled={!!activeVoucher}
            className="text-[#900036] font-medium text-sm disabled:opacity-50 pt-3"
          >
            Apply
          </button>
        </form>
      </Form>

      {/* ACTIVE VOUCHER */}
      {activeVoucher && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex justify-between items-center">
          <div>
            <p className="font-medium">{activeVoucher.code} applied</p>
            <p>{activeVoucher.value}% discount applied</p>
          </div>
          <button
            type="button"
            onClick={removeVoucher}
            className="text-xs text-red-600 font-medium"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

export default VoucherCodeForm
