'use client'

import { addAdminProduct } from '@/lib/product'
import { getAllCategories } from '@/lib/product'
import { uploadVariantImages } from '@/lib/product-upload'
import { addProductSchema, AddProductFormValues } from '@/form-schema/addProductSchema'
import { cn } from '@/lib/utils'
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// ─── Types ──────────────────────────────────────────────────────────────────────
type Category = {
  category_id: number
  name: string
}

// ─── Icons ──────────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="7" y1="1" x2="7" y2="13" /><line x1="1" y1="7" x2="13" y2="7" />
  </svg>
)

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
)

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
)

// ─── Base UI ─────────────────────────────────────────────────────────────────────
const FieldErrorCtx = React.createContext(false)

function Field({
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
          <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400 select-none">
            {label}
            {required && <span className="text-rose-400 leading-none">*</span>}
          </label>
        )}
        {children}
        {error ? (
          <p className="flex items-center gap-1 text-[11px] text-rose-500 font-medium mt-0.5">
            <AlertIcon />{error}
          </p>
        ) : hint ? (
          <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>
        ) : null}
      </div>
    </FieldErrorCtx.Provider>
  )
}

const inputBase = [
  'w-full rounded-md border bg-white px-3 py-2 text-[13px] text-slate-800 outline-none leading-5',
  'border-slate-200 placeholder:text-slate-300',
  'focus:border-slate-400 focus:ring-2 focus:ring-slate-100',
  'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
  'transition-colors duration-150',
].join(' ')

const inputError = 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const hasError = React.useContext(FieldErrorCtx)
  return <input className={cn(inputBase, hasError && inputError, className)} {...props} />
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const hasError = React.useContext(FieldErrorCtx)
  return <textarea rows={3} className={cn(inputBase, 'resize-none', hasError && inputError, className)} {...props} />
}

function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const hasError = React.useContext(FieldErrorCtx)
  return (
    <select className={cn(inputBase, 'cursor-pointer', hasError && inputError, className)} {...props}>
      {children}
    </select>
  )
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-start gap-3 text-left">
      <span className={cn(
        'relative mt-0.5 inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border transition-colors duration-200',
        checked ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300',
      )}>
        <span
          className="inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ transform: checked ? 'translateX(14px)' : 'translateX(2px)' }}
        />
      </span>
      <span className="flex flex-col">
        <span className="text-[13px] text-slate-700 leading-snug">{label}</span>
        {description && <span className="text-[11px] text-slate-400 mt-0.5">{description}</span>}
      </span>
    </button>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300 whitespace-nowrap">{label}</span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  )
}

// ─── Constants ───────────────────────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const SIZE_OPTIONS = [
  'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL',
  '28', '29', '30', '31', '32', '33', '34', '36', '38', '40', '42',
  '2L', '1L', '500ml', '300ml', 'One Size',
]

const FLAVOR_OPTIONS = ['Lime', 'Orange', 'Coke']

const BLANK_VARIANT = {
  price: undefined as unknown as number,
  stock: undefined as unknown as number,
  is_active: true,
  attributes: [
    { attribute_name: 'Size', attribute_value: '' },
    { attribute_name: 'Flavor', attribute_value: '' },
  ],
  images: [],
}

// ─── Image Upload Zone ────────────────────────────────────────────────────────────
function ImageUploadZone({ variantIndex }: { variantIndex: number }) {
  const { control, setValue, watch } = useFormContext<AddProductFormValues>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: `variants.${variantIndex}.images`,
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([])

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return
      const currentCount = fields.length
      const rejected: { name: string; reason: string }[] = []

      Array.from(files).forEach((file, i) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          rejected.push({ name: file.name, reason: 'Only JPEG, PNG, WebP, or GIF allowed' })
          return
        }
        if (file.size > MAX_IMAGE_SIZE) {
          rejected.push({ name: file.name, reason: 'Image must be under 5 MB' })
          return
        }
        append({
          file,
          preview: URL.createObjectURL(file),
          is_primary: currentCount === 0 && i === 0,
          sort_order: currentCount + i,
        })
      })

      if (rejected.length > 0) {
        setRejectedFiles(rejected.map(r => `${r.name} — ${r.reason}`))
        setTimeout(() => setRejectedFiles([]), 4000)
      }
    },
    [append, fields.length],
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const setPrimary = (idx: number) => {
    fields.forEach((_, i) => {
      setValue(`variants.${variantIndex}.images.${i}.is_primary`, i === idx)
    })
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-6 cursor-pointer transition-all duration-150',
          dragging ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60',
        )}
      >
        <div className="text-slate-300"><UploadIcon /></div>
        <div className="text-center">
          <p className="text-[12px] text-slate-500 font-medium">
            Drop images here or <span className="text-slate-700 underline underline-offset-2">browse</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">JPEG · PNG · WebP · GIF — max 5 MB each</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {rejectedFiles.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <AlertIcon />
          <p className="text-[11px] text-amber-700">Skipped: {rejectedFiles.join(', ')}</p>
        </div>
      )}

      {fields.length > 0 && (
        <div className="grid grid-cols-5 gap-1.5">
          {fields.map((field, idx) => {
            const img = watch(`variants.${variantIndex}.images.${idx}`)
            const isPrimary = img?.is_primary
            return (
              <div
                key={field.id}
                className={cn(
                  'relative group rounded-md overflow-hidden border aspect-square bg-slate-100 transition-all',
                  isPrimary ? 'ring-2 ring-slate-700 ring-offset-1' : 'border-slate-200',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img?.preview} alt="" className="w-full h-full object-cover" />

                {isPrimary && (
                  <div className="absolute top-1 left-1 bg-slate-800 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-sm leading-tight tracking-wide uppercase">
                    Cover
                  </div>
                )}

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!isPrimary && (
                    <button
                      type="button"
                      onClick={() => setPrimary(idx)}
                      title="Set as cover"
                      className="p-1.5 rounded bg-white/20 text-white hover:bg-white/30 transition-colors"
                    >
                      <StarIcon filled={false} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    title="Remove"
                    className="p-1.5 rounded bg-white/20 text-white hover:bg-rose-500/80 transition-colors"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-md border border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:border-slate-300 hover:text-slate-400 hover:bg-slate-50 transition-all"
          >
            <PlusIcon />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Variant Card ─────────────────────────────────────────────────────────────────
function VariantCard({ index, onRemove, isOnly }: { index: number; onRemove: () => void; isOnly: boolean }) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<AddProductFormValues>()
  const variantErrors = errors.variants?.[index]

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-white">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          Variant {index + 1}
        </span>
        {!isOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-500 transition-colors font-medium"
          >
            <TrashIcon /> Remove
          </button>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price" required error={variantErrors?.price?.message}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 pointer-events-none font-medium select-none">₱</span>
              <Input
                {...register(`variants.${index}.price`, {
                  setValueAs: v => v === '' ? undefined : parseFloat(v),
                })}
                type="number" min={0} step={0.01} placeholder="0.00"
                className="pl-7"
              />
            </div>
          </Field>
          <Field label="Stock" error={variantErrors?.stock?.message}>
            <Input
              {...register(`variants.${index}.stock`, {
                setValueAs: v => v === '' ? undefined : parseInt(v, 10),
              })}
              type="number" min={0} step={1} placeholder="0"
            />
          </Field>
        </div>

        <Toggle
          checked={watch(`variants.${index}.is_active`) ?? true}
          onChange={v => setValue(`variants.${index}.is_active`, v)}
          label="Active"
          description="Make this variant available for purchase"
        />

        <div className="flex flex-col gap-3">
          <SectionDivider label="Attributes" />

          <Field label="Size" error={variantErrors?.attributes?.[0]?.attribute_value?.message}>
            <Select
              {...register(`variants.${index}.attributes.0.attribute_value`)}
              onChange={e => {
                setValue(`variants.${index}.attributes.0.attribute_name`, 'Size')
                setValue(`variants.${index}.attributes.0.attribute_value`, e.target.value)
              }}
            >
              <option value="">Select size…</option>
              {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>

          <Field label="Flavor" error={variantErrors?.attributes?.[1]?.attribute_value?.message}>
            <Select
              {...register(`variants.${index}.attributes.1.attribute_value`)}
              onChange={e => {
                setValue(`variants.${index}.attributes.1.attribute_name`, 'Flavor')
                setValue(`variants.${index}.attributes.1.attribute_value`, e.target.value)
              }}
            >
              <option value="">Select flavor…</option>
              {FLAVOR_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </Select>
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <SectionDivider label="Images" />
          <ImageUploadZone variantIndex={index} />
        </div>
      </div>
    </div>
  )
}

// ─── Step Indicator ───────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Basic info', description: 'Name, category, pricing' },
  { label: 'Variants', description: 'Stock, attributes, images' },
  { label: 'Details', description: 'Extra attributes' },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-start gap-0 mb-6">
      {STEPS.map((step, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
            <div className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all duration-300 border',
              i < current
                ? 'bg-slate-800 border-slate-800 text-white'
                : i === current
                  ? 'bg-white border-slate-800 text-slate-800 ring-4 ring-slate-100'
                  : 'bg-white border-slate-200 text-slate-300',
            )}>
              {i < current ? <CheckIcon /> : i + 1}
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className={cn(
                'text-[11px] font-semibold whitespace-nowrap transition-colors',
                i === current ? 'text-slate-800' : i < current ? 'text-slate-500' : 'text-slate-300',
              )}>
                {step.label}
              </span>
              <span className={cn(
                'text-[10px] whitespace-nowrap hidden sm:block transition-colors',
                i === current ? 'text-slate-400' : 'text-slate-300',
              )}>
                {step.description}
              </span>
            </div>
          </div>

          {i < STEPS.length - 1 && (
            <div className="flex-1 mx-1 mt-3">
              <div className={cn('h-px transition-colors duration-500', i < current ? 'bg-slate-800' : 'bg-slate-200')} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Step 1: Basic Info ───────────────────────────────────────────────────────────
function Step1BasicInfo({ categories }: { categories: Category[] }) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<AddProductFormValues>()

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    register('name').onChange(e)
    setValue('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), { shouldValidate: true })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Field label="Product name" required error={errors.name?.message}>
          <Input {...register('name')} onChange={handleNameChange} placeholder="e.g. Classic White Tee" />
        </Field>

        <Field label="Slug" required error={errors.slug?.message} hint="Auto-generated from name — editable">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-[11px] text-slate-300 pointer-events-none select-none whitespace-nowrap font-medium">
              /products/
            </span>
            <Input {...register('slug')} className="pl-[74px]" placeholder="classic-white-tee" />
          </div>
        </Field>

        <Field label="Description" error={errors.description?.message}>
          <Textarea
            {...register('description')}
            placeholder="Describe your product — materials, fit, key features…"
            rows={3}
          />
        </Field>
      </div>

      <div className="h-px bg-slate-100" />

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" required error={errors.category_id?.message}>
            <Select {...register('category_id', { valueAsNumber: true })}>
              <option value="">Select…</option>
              {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
            </Select>
          </Field>

          <Field label="Type" required error={errors.type?.message}>
            <Select {...register('type')}>
              <option value="">Select…</option>
              <option value="Physical">Physical</option>
              <option value="Digital">Digital</option>
            </Select>
          </Field>
        </div>

        <Field label="Discount" error={errors.discount?.message} hint="Leave blank for no discount" className="max-w-[180px]">
          <div className="relative">
            <Input
              {...register('discount', { setValueAs: v => v === '' ? null : parseFloat(v) })}
              type="number" min={0} max={100} step={0.01} placeholder="0"
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 pointer-events-none select-none">%</span>
          </div>
        </Field>
      </div>

      <div className="h-px bg-slate-100" />

      <div className="flex flex-col gap-3.5">
        <Toggle
          checked={watch('is_active') ?? true}
          onChange={v => setValue('is_active', v)}
          label="Active — visible in store"
          description="Customers will be able to find and purchase this product"
        />
        <Toggle
          checked={watch('wholesale') ?? false}
          onChange={v => setValue('wholesale', v)}
          label="Wholesale product"
          description="This product is available for wholesale orders"
        />
      </div>
    </div>
  )
}

// ─── Step 2: Variants ─────────────────────────────────────────────────────────────
function Step2Variants() {
  const { control, formState: { errors } } = useFormContext<AddProductFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' })

  return (
    <div className="flex flex-col gap-3">
      {errors.variants?.root && (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
          <span className="text-rose-500"><AlertIcon /></span>
          <p className="text-[12px] text-rose-700 font-medium">{errors.variants.root.message}</p>
        </div>
      )}

      {fields.map((field, idx) => (
        <VariantCard
          key={field.id}
          index={idx}
          isOnly={fields.length === 1}
          onRemove={() => remove(idx)}
        />
      ))}

      <button
        type="button"
        onClick={() => append(BLANK_VARIANT)}
        className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-3 text-[12px] font-medium text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-slate-50/60 transition-all"
      >
        <PlusIcon /> Add variant
      </button>
    </div>
  )
}

// ─── Step 3: Details ──────────────────────────────────────────────────────────────
function Step3Details() {
  const { register, control, formState: { errors } } = useFormContext<AddProductFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'details' })

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-[12px] text-slate-500 leading-relaxed">
          Add structured attributes shown on the product page — e.g.{' '}
          <span className="font-medium text-slate-700">Material</span>,{' '}
          <span className="font-medium text-slate-700">Care Instructions</span>,{' '}
          <span className="font-medium text-slate-700">Country of Origin</span>.
          These are displayed as a spec table to customers.
        </p>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-10 flex flex-col items-center gap-2 text-center">
          <span className="text-[11px] font-medium text-slate-300 uppercase tracking-widest">No details added</span>
          <p className="text-[11px] text-slate-300 max-w-[200px]">
            Optional — skip this step if you don't have extra specs to display
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-300">Attribute</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-300">Value</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-300">Order</span>
          </div>

          {fields.map((field, idx) => (
            <div key={field.id} className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 items-start">
              <Field label="" error={errors.details?.[idx]?.attribute_name?.message}>
                <Input {...register(`details.${idx}.attribute_name`)} placeholder="Material" />
              </Field>
              <Field label="" error={errors.details?.[idx]?.attribute_value?.message}>
                <Input {...register(`details.${idx}.attribute_value`)} placeholder="100% Cotton" />
              </Field>
              <Input
                {...register(`details.${idx}.sort_order`, { valueAsNumber: true })}
                type="number" min={0} placeholder="0"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="mt-1.5 p-1.5 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => append({ attribute_name: '', attribute_value: '', sort_order: fields.length + 1 })}
        className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-3 text-[12px] font-medium text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-slate-50/60 transition-all w-full"
      >
        <PlusIcon /> Add detail
      </button>
    </div>
  )
}

// ─── Step Error Banner ────────────────────────────────────────────────────────────
function StepErrorBanner({ errorCount }: { errorCount: number }) {
  if (errorCount === 0) return null
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
      <span className="text-rose-500 shrink-0"><AlertIcon /></span>
      <p className="text-[12px] text-rose-700 font-medium leading-snug">
        {errorCount === 1 ? '1 field needs attention before continuing.' : `${errorCount} fields need attention before continuing.`}
      </p>
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────────
interface AddProductFormProps {
  onSuccess?: (data: AddProductFormValues) => void
  onCancel?: () => void
}

const STEP_FIELDS: (keyof AddProductFormValues)[][] = [
  ['name', 'slug', 'description', 'category_id', 'type', 'discount', 'is_active', 'wholesale'],
  ['variants'],
  ['details'],
]

export const AddProductForm = ({ onSuccess, onCancel }: AddProductFormProps) => {
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [stepErrorCount, setStepErrorCount] = useState(0)

  useEffect(() => {
    getAllCategories()
      .then(data => setCategories(data ?? []))
      .catch(err => setCategoryError(err.message))
      .finally(() => setLoadingCategories(false))
  }, [])

  const methods = useForm<AddProductFormValues>({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      is_active: true,
      wholesale: false,
      discount: null,
      type: '',
      variants: [BLANK_VARIANT],
      details: [],
    },
    mode: 'onTouched',
  })

  const { trigger, formState: { errors } } = methods

  useEffect(() => {
    const count = STEP_FIELDS[step].filter(k => !!errors[k]).length
    setStepErrorCount(count)
  }, [errors, step])

  const goNext = async () => {
    const valid = await trigger(STEP_FIELDS[step] as any)
    if (valid) {
      setStep(s => s + 1)
      setStepErrorCount(0)
    }
  }

  const goBack = () => {
    setStep(s => s - 1)
    setStepErrorCount(0)
    setSaveError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const data = methods.getValues()
      const variantsWithPaths = await uploadVariantImages(data.variants)
      await addAdminProduct({ ...data, variants: variantsWithPaths })
      onSuccess?.(data)
    } catch (err: any) {
      setSaveError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormProvider {...methods}>
      <form className="flex flex-col" noValidate>
        <StepIndicator current={step} />

        <StepErrorBanner errorCount={stepErrorCount} />

        {saveError && (
          <div className="flex items-center gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 mb-4">
            <span className="text-rose-500 shrink-0"><AlertIcon /></span>
            <p className="text-[12px] text-rose-700 font-medium">{saveError}</p>
          </div>
        )}

        {categoryError && (
          <div className="flex items-center gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 mb-4">
            <span className="text-amber-500 shrink-0"><AlertIcon /></span>
            <p className="text-[12px] text-amber-700">Could not load categories: {categoryError}</p>
          </div>
        )}

        <div className="max-h-[54vh] overflow-y-auto pr-1 -mr-1">
          {step === 0 && <Step1BasicInfo categories={loadingCategories ? [] : categories} />}
          {step === 1 && <Step2Variants />}
          {step === 2 && <Step3Details />}
        </div>

        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={step === 0 ? onCancel : goBack}
            className="flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            {step === 0 ? 'Cancel' : <><ChevronLeft /> Back</>}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-300 mr-1 select-none">{step + 1} / {STEPS.length}</span>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="flex items-center gap-1.5 rounded-md bg-slate-800 px-5 py-2 text-[13px] font-semibold text-white hover:bg-slate-900 active:scale-[0.97] transition-all"
              >
                Continue <ChevronRight />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-md bg-slate-800 px-5 py-2 text-[13px] font-semibold text-white hover:bg-slate-900 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {saving ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saving…
                  </>
                ) : (
                  <><CheckIcon /> Save product</>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </FormProvider>
  )
}

export default AddProductForm