'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addPromoCodeSchema, type AddPromoCodeFormValues } from '@/lib/validations/promo-code'
import { createPromoCode } from '@/lib/admin/promotional-codes/promo-code'
import { PromoCodeFields } from './PromoCodeUIForm'

type Props = {
  onSuccess: (data: AddPromoCodeFormValues) => void
  onCancel: () => void
}

export function AddPromoCodeForm({ onSuccess, onCancel }: Props) {
  const methods = useForm<AddPromoCodeFormValues>({
    resolver: zodResolver(addPromoCodeSchema),
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

  const onSubmit = async (values: AddPromoCodeFormValues) => {
    const result = await createPromoCode(values)
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
          <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5">
            <p className="text-[12px] text-danger font-medium">
              {errors.root.message}
            </p>
          </div>
        )}

        <PromoCodeFields />

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
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Promo Code'}
          </button>
        </div>

      </form>
    </FormProvider>
  )
}
