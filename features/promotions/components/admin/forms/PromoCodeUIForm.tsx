'use client'

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { cn } from '@/shared/utils/cn'
import type { AddPromoCodeFormValues } from '@/features/promotions/validations/promo-code'

// helpers

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const msg = (error: any): string | undefined => error?.message as string | undefined

// icons

const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

// base UI primitives

const FieldErrorCtx = React.createContext(false)

export function Field({
  label, error, children, required, hint, className,
}: {
  label: string
  error?: string
  children: React.ReactNode
  required?: boolean
  hint?: string
  className?: string
}) {
  return (
    <FieldErrorCtx.Provider value={!!error}>
      <div className={cn('flex flex-col gap-1', className)}>
        {label && (
          <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground select-none">
            {label}
            {required && <span className="text-danger leading-none">*</span>}
          </label>
        )}
        {children}
        {error ? (
          <p className="flex items-center gap-1 text-[11px] text-danger font-medium mt-0.5">
            <AlertIcon />{error}
          </p>
        ) : hint ? (
          <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
        ) : null}
      </div>
    </FieldErrorCtx.Provider>
  )
}

const inputBase = [
  'w-full rounded-md border bg-white px-3 py-2 text-[13px] text-foreground outline-hidden leading-5',
  'border-border placeholder:text-muted-foreground',
  'focus:border-ring focus:ring-2 focus:ring-ring',
  'disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed',
  'transition-colors duration-150',
].join(' ')

const inputError = 'border-danger/30 focus:border-danger focus:ring-danger/20'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const hasError = React.useContext(FieldErrorCtx)
  return <input className={cn(inputBase, hasError && inputError, className)} {...props} />
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const hasError = React.useContext(FieldErrorCtx)
  return (
    <select className={cn(inputBase, 'cursor-pointer', hasError && inputError, className)} {...props}>
      {children}
    </select>
  )
}

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