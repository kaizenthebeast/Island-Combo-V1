'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addVoucherSchema, type AddVoucherFormValues } from '@/form-schema/voucherSchema'
import { createVoucher } from '@/lib/voucher'
import { VoucherFields } from './VoucherUIForm'

type Props = {
  onSuccess: (data: AddVoucherFormValues) => void
  onCancel: () => void
}

export function AddVoucherForm({ onSuccess, onCancel }: Props) {
  const methods = useForm<AddVoucherFormValues>({
    resolver: zodResolver(addVoucherSchema),
    defaultValues: {
      code: '',
      value: undefined,
      min_quantity: null,
      expires_at: null,
      status: 'ACTIVE',
    },
  })

  const {
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
  } = methods

  const onSubmit = async (values: AddVoucherFormValues) => {
    const result = await createVoucher(values)
    if (!result.success) {
      setError('root', { message: result.message })
      return
    }
    onSuccess(values)
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {errors.root && (
          <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
            <p className="text-[12px] text-rose-700 font-medium">
              {errors.root.message}
            </p>
          </div>
        )}

        <VoucherFields />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-slate-800 px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-900 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Voucher'}
          </button>
        </div>

      </form>
    </FormProvider>
  )
}