'use client'

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { cn } from '@/lib/utils/cn'

// Types

export type CategoryOption = {
  category_id: number
  name: string
}

const msg = (error: any): string | undefined => error?.message as string | undefined

// Icons

export const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

// Base UI

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

// CategoryFields

export function CategoryFields({ categories }: { categories?: CategoryOption[] }) {
  const { register, formState: { errors } } = useFormContext<any>()

  return (
    <div className="flex flex-col gap-5">

      <Field label="Category name" required error={msg(errors.name)}>
        <Input
          {...register('name')}
          placeholder="e.g. Apparel"
        />
      </Field>

      {categories && (
        <>
          <div className="h-px bg-muted" />

          <Field
            label="Parent category"
            error={msg(errors.parent_id)}
            hint="Optional — leave blank for a top-level category"
          >
            <Select
              {...register('parent_id', {
                setValueAs: (v) => v === '' ? null : parseInt(v, 10),
              })}
            >
              <option value="">None (top-level)</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        </>
      )}

    </div>
  )
}
