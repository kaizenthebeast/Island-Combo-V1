'use client'

import { useFormContext } from 'react-hook-form'
import { Field, Input, Select } from '@/shared/components/admin/FormField'
import type { AddPromoCodeFormValues } from '@/features/promotions/validations/promo-code'

// helpers

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const msg = (error: any): string | undefined => error?.message as string | undefined

// Field primitives moved to shared/components/admin/FormField so other admin
// forms (e.g. banner management) render identically. Re-exported to keep this
// module's existing import surface working.
export { Field, Input, Select }

// PromoCodeFields

export function PromoCodeFields() {
  const { register, formState: { errors } } = useFormContext<AddPromoCodeFormValues>()

  return (
    <div className="flex flex-col gap-5">

      {/* Code */}
      <Field label="Promo Code" required error={msg(errors.code)}>
        <Input
          {...register('code')}
          placeholder="e.g. SAVE20"
          className="uppercase placeholder:normal-case"
          autoComplete="off"
        />
      </Field>

      <div className="h-px bg-muted" />

      {/* Discount value — always percentage */}
      <Field
        label="Discount Value"
        required
        error={msg(errors.value)}
        hint="Percentage applied to the order total (1–100)"
      >
        <div className="relative">
          <Input
            {...register('value', { valueAsNumber: true })}
            type="number"
            min={1}
            max={100}
            step={1}
            placeholder="e.g. 10"
            className="pr-8"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
            %
          </span>
        </div>
      </Field>

      {/* Min quantity */}
      <Field
        label="Min. Order Quantity"
        error={msg(errors.min_quantity)}
        hint="Optional — leave blank for no minimum"
      >
        <Input
          {...register('min_quantity', {
            setValueAs: (v) => (v === '' || v === null || isNaN(Number(v)) ? null : Number(v)),
          })}
          type="number"
          min={0}
          step={1}
          placeholder="No minimum"
        />
      </Field>

      <div className="h-px bg-muted" />

      {/* Expiry date */}
      <Field
        label="Expiry Date"
        error={msg(errors.expires_at)}
        hint="Optional — leave blank for no expiry"
      >
        <Input
          {...register('expires_at', {
            setValueAs: (v) => (v === '' ? null : v),
          })}
          type="date"
        />
      </Field>

      {/* Status */}
      <Field
        label="Status"
        required
        error={msg(errors.status)}
        hint="Archived status is set via the archive action"
      >
        <Select {...register('status')}>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
        </Select>
      </Field>

    </div>
  )
}

// default export for backwards compat

export default PromoCodeFields