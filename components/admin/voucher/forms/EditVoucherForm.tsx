'use client'

import { useEffect, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { editVoucherSchema, type EditVoucherFormValues } from '@/lib/validators/voucher'
import { updateVoucher, restoreVoucher } from '@/lib/admin/vouchers/voucher'
import { VoucherFields } from './VoucherUIForm'
import { ArchiveRestore } from 'lucide-react'
import type { Voucher } from '@/lib/types/voucher'

type Props = {
  voucher: Voucher
  onSuccess: (data: EditVoucherFormValues) => void
  onCancel: () => void
}

export function EditVoucherForm({ voucher, onSuccess, onCancel }: Props) {
  const [isRestoring, setIsRestoring] = useState(false)

  const methods = useForm<EditVoucherFormValues>({
    resolver: zodResolver(editVoucherSchema),
  })

  const {
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting, errors },
  } = methods

  useEffect(() => {
    reset({
      code: voucher.code,
      value: voucher.value,
      min_quantity: voucher.min_quantity,
      expires_at: voucher.expires_at ? voucher.expires_at.slice(0, 10) : null,
      status: voucher.status, // ARCHIVED is now valid in editVoucherSchema
    })
  }, [voucher, reset])

  const onSubmit = async (values: EditVoucherFormValues) => {
    const result = await updateVoucher(voucher.id, values)
    if (!result.success) {
      setError('root', { message: result.message })
      return
    }
    onSuccess(values)
  }

  const handleRestore = async () => {
    setIsRestoring(true)
    try {
      await restoreVoucher(voucher.id)
      onSuccess({ ...methods.getValues() })
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Failed to restore voucher',
      })
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {errors.root && (
          <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5">
            <p className="text-[12px] text-danger font-medium">
              {errors.root.message}
            </p>
          </div>
        )}

        {voucher.status === 'ARCHIVED' && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning-tint px-3 py-2.5">
            <div className="flex items-center gap-2">
              <ArchiveRestore className="h-4 w-4 shrink-0 text-warning" />
              <p className="text-[12px] text-warning font-medium">
                This voucher is archived and cannot be used at checkout.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRestore}
              disabled={isRestoring}
              className="shrink-0 rounded-md bg-warning hover:bg-warning disabled:opacity-50 px-3 py-1.5 text-[12px] font-medium text-white transition-colors"
            >
              {isRestoring ? 'Restoring…' : 'Restore'}
            </button>
          </div>
        )}

        <VoucherFields />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || voucher.status === 'ARCHIVED'}
            className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </form>
    </FormProvider>
  )
}