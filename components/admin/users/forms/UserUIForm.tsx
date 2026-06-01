'use client'

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const msg = (error: any): string | undefined => error?.message as string | undefined

// ─── Icons ────────────────────────────────────────────────────────────────────

export const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

// ─── Base UI ──────────────────────────────────────────────────────────────────

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

// ─── UserFields ───────────────────────────────────────────────────────────────

export function UserFields() {
  const { register, formState: { errors } } = useFormContext<any>()

  return (
    <div className="flex flex-col gap-5">

      {/* ── Profile ─────────────────────────────────────────────────── */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground select-none">
        Profile
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" required error={msg(errors.first_name)}>
          <Input
            {...register('first_name')}
            placeholder="Juan"
          />
        </Field>
        <Field label="Last name" required error={msg(errors.last_name)}>
          <Input
            {...register('last_name')}
            placeholder="dela Cruz"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Email" required error={msg(errors.email)}>
          <Input
            {...register('email')}
            type="email"
            placeholder="user@example.com"
          />
        </Field>
        <Field label="Phone" error={msg(errors.phone_text)}>
          <Input
            {...register('phone_text')}
            placeholder="+63 912 345 6789"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Sex" error={msg(errors.sex)}>
          <Select {...register('sex')}>
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </Select>
        </Field>
        <Field label="Age" error={msg(errors.age)}>
          <Input
            {...register('age', {
              setValueAs: (v) => v === '' ? undefined : Number(v),
            })}
            type="number"
            min={0}
            placeholder="25"
          />
        </Field>
      </div>

      <div className="h-px bg-muted" />

      {/* ── Access ──────────────────────────────────────────────────── */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground select-none">
        Access
      </p>

      <Field label="Role" required error={msg(errors.role)}>
        <Select {...register('role')}>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>

    </div>
  )
}