'use client'

import React from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import type { Voucher } from '@/types/voucher'

type FormValues = {
  voucherCode: string
}

type AppliedVoucher = Pick<Voucher, 'code' | 'value'>

type Props = {
  setVoucher: (voucher: AppliedVoucher | null) => void
  activeVoucher: AppliedVoucher | null
}

const VoucherCodeForm = ({ setVoucher, activeVoucher }: Props) => {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm<FormValues>()

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await res.json()

    if (!res.ok) {
      setVoucher(null)
      setError('voucherCode', {
        message: result.error || 'Invalid voucher code',
      })
      return
    }

    clearErrors('voucherCode')
    setVoucher(
      result.voucher
        ? { code: result.voucher.code, value: result.voucher.value }
        : null
    )

    reset()
  }

  const removeVoucher = () => {
    setVoucher(null)
    reset()
  }

  return (
    <div className="space-y-3">

      <h3 className="text-base font-semibold">Apply Voucher Code</h3>

      {/* INPUT */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Voucher code"
          disabled={!!activeVoucher}
          {...register('voucherCode', {
            required: 'Voucher code is required',
            minLength: {
              value: 3,
              message: 'Voucher code must be at least 3 characters',
            },
          })}
          className="flex-1 bg-transparent border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#900036] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!!activeVoucher}
          className="text-[#900036] font-medium text-sm disabled:opacity-50"
        >
          Apply
        </button>
      </form>

      {/* ERROR */}
      {errors.voucherCode && (
        <p className="text-sm text-red-500">{errors.voucherCode.message}</p>
      )}

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