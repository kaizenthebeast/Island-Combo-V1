'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { cn } from '@/lib/utils/cn'
import { PRODUCT_TYPES } from '@/types/product'

// Types

export type Category = {
  id: number
  name: string
  parent_id: number | null
}
// Icons

export const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="7" y1="1" x2="7" y2="13" /><line x1="1" y1="7" x2="13" y2="7" />
  </svg>
)

export const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
)

export const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

export const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

export const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

export const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

export const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
)

export const XIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export const TagIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
)

// Constants

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export const SIZE_OPTIONS = [
  'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL',
  '28', '29', '30', '31', '32', '33', '34', '36', '38', '40', '42',
  '2L', '1L', '500ml', '300ml',
]

export const FLAVOR_OPTIONS = ['Lime', 'Orange', 'Coke', 'Lemon', 'Strawberry', 'Mango', 'Watermelon']

export const COLOR_OPTIONS = [
  'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow',
  'Pink', 'Purple', 'Gray', 'Navy', 'Beige', 'Brown', 'Orange',
]

export const PREDEFINED_ATTRIBUTE_TYPES: { name: string; options?: string[] }[] = [
  { name: 'Size', options: SIZE_OPTIONS },
  { name: 'Color', options: COLOR_OPTIONS },
  { name: 'Flavor', options: FLAVOR_OPTIONS },
  { name: 'Material' },
  { name: 'Weight' },
  { name: 'Style' },
]

// makeBlankVariant

export const makeBlankVariant = (attributeTypes: string[]) => ({
  price: undefined as unknown as number,
  stock: undefined as unknown as number,
  is_active: true,
  attributes: attributeTypes.map(name => ({ attribute_name: name, attribute_value: '' })),
  images: [] as any[],
  pricing_tiers: [] as any[],
})

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

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const hasError = React.useContext(FieldErrorCtx)
  return (
    <textarea
      rows={3}
      className={cn(inputBase, 'resize-none', hasError && inputError, className)}
      {...props}
    />
  )
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const hasError = React.useContext(FieldErrorCtx)
  return (
    <select className={cn(inputBase, 'cursor-pointer', hasError && inputError, className)} {...props}>
      {children}
    </select>
  )
}

export function Toggle({
  checked, onChange, label, description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-start gap-3 text-left">
      <span className={cn(
        'relative mt-0.5 inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border transition-colors duration-200',
        checked ? 'bg-primary border-primary' : 'bg-white border-border',
      )}>
        <span
          className="inline-block h-3 w-3 rounded-full bg-white shadow-xs transition-transform duration-200"
          style={{ transform: checked ? 'translateX(14px)' : 'translateX(2px)' }}
        />
      </span>
      <span className="flex flex-col">
        <span className="text-[13px] text-foreground leading-snug">{label}</span>
        {description && <span className="text-[11px] text-muted-foreground mt-0.5">{description}</span>}
      </span>
    </button>
  )
}

export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{label}</span>
      <div className="h-px flex-1 bg-muted" />
    </div>
  )
}

// PricingTiersSection

export function PricingTiersSection({ variantIndex }: { variantIndex: number }) {
  const { control, register, formState: { errors } } = useFormContext<any>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: `variants.${variantIndex}.pricing_tiers`,
  })

  // react-hook-form can't type errors on numerically-indexed field arrays, so cast to read them.
  const tierErrors = (errors.variants as any)?.[variantIndex]?.pricing_tiers

  return (
    <div className="flex flex-col gap-2.5">
      {fields.length > 0 && (
        <div className="grid grid-cols-[120px_1fr_32px] gap-2 px-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Min qty</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Discount %</span>
        </div>
      )}

      {fields.map((field, idx) => (
        <div key={field.id} className="grid grid-cols-[120px_1fr_32px] gap-2 items-start">
          <input
            type="hidden"
            {...register(`variants.${variantIndex}.pricing_tiers.${idx}.label`)}
            value="wholesale"
          />

          <Field label="" error={tierErrors?.[idx]?.min_quantity?.message}>
            <Input
              {...register(`variants.${variantIndex}.pricing_tiers.${idx}.min_quantity`, {
                setValueAs: (v) => v === '' ? undefined : parseInt(v, 10),
              })}
              type="number" min={1} step={1} placeholder="e.g. 10"
            />
          </Field>

          <Field label="" error={tierErrors?.[idx]?.discount_percent?.message}>
            <div className="relative">
              <Input
                {...register(`variants.${variantIndex}.pricing_tiers.${idx}.discount_percent`, {
                  setValueAs: (v) => v === '' ? undefined : parseFloat(v),
                })}
                type="number" min={0} max={100} step={0.01} placeholder="e.g. 20"
                className="pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none select-none">%</span>
            </div>
          </Field>

          <button
            type="button"
            onClick={() => remove(idx)}
            className="mt-1.5 p-1.5 rounded text-muted-foreground hover:text-danger hover:bg-danger-tint transition-colors"
          >
            <TrashIcon />
          </button>
        </div>
      ))}

      {tierErrors?.root?.message && (
        <p className="flex items-center gap-1 text-[11px] text-danger font-medium">
          <AlertIcon />{tierErrors.root.message}
        </p>
      )}
      {typeof tierErrors?.message === 'string' && (
        <p className="flex items-center gap-1 text-[11px] text-danger font-medium">
          <AlertIcon />{tierErrors.message}
        </p>
      )}

      {fields.length === 0 && (
        <button
          type="button"
          onClick={() => append({
            label: 'wholesale',
            min_quantity: undefined as unknown as number,
            discount_percent: undefined as unknown as number,
          })}
          className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border py-2 text-[11px] font-medium text-muted-foreground hover:border-border hover:text-muted-foreground hover:bg-muted/60 transition-all"
        >
          <PlusIcon /> Add wholesale pricing
        </button>
      )}
    </div>
  )
}

// ImageUploadZone

export function ImageUploadZone({ variantIndex }: { variantIndex: number }) {
  const { control, setValue, watch } = useFormContext<any>()
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
          // url is absent for new uploads — only present for existing images
        })
      })

      if (rejected.length > 0) {
        setRejectedFiles(rejected.map((r) => `${r.name} — ${r.reason}`))
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
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-6 cursor-pointer transition-all duration-150',
          dragging
            ? 'border-border bg-muted'
            : 'border-border hover:border-border hover:bg-muted/60',
        )}
      >
        <div className="text-muted-foreground"><UploadIcon /></div>
        <div className="text-center">
          <p className="text-[12px] text-muted-foreground font-medium">
            Drop images here or <span className="text-foreground underline underline-offset-2">browse</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">JPEG · PNG · WebP · GIF — max 5 MB each</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {rejectedFiles.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-tint px-3 py-2">
          <AlertIcon />
          <p className="text-[11px] text-warning">Skipped: {rejectedFiles.join(', ')}</p>
        </div>
      )}

      {fields.length > 0 && (
        <div className="grid grid-cols-5 gap-1.5">
          {fields.map((field, idx) => {
            const image = watch(`variants.${variantIndex}.images.${idx}`)
            const isPrimary = image?.is_primary
            // Existing image: has a url (Storage path) and no File object
            const isExisting = !image?.file && !!image?.url

            return (
              <div
                key={field.id}
                className={cn(
                  'relative group rounded-md overflow-hidden border aspect-square bg-muted transition-all',
                  isPrimary ? 'ring-2 ring-foreground ring-offset-1' : 'border-border',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image?.preview}
                  alt=""
                  className="w-full h-full object-cover"
                />

                {isPrimary && (
                  <div className="absolute top-1 left-1 bg-primary text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-sm leading-tight tracking-wide uppercase">
                    Cover
                  </div>
                )}

                {/* Badge for existing Storage images — visually distinct from new uploads */}
                {isExisting && !isPrimary && (
                  <div className="absolute top-1 left-1 bg-info text-white text-[7px] font-semibold px-1.5 py-0.5 rounded-sm leading-tight tracking-wide uppercase">
                    Saved
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
                    className="p-1.5 rounded bg-white/20 text-white hover:bg-danger/80 transition-colors"
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
            className="aspect-square rounded-md border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-border hover:text-muted-foreground hover:bg-muted transition-all"
          >
            <PlusIcon />
          </button>
        </div>
      )}
    </div>
  )
}

// AttributeTypeSelector

export function AttributeTypeSelector({
  selected, onAdd, onRemove,
}: {
  selected: string[]
  onAdd: (name: string) => void
  onRemove: (name: string) => void
}) {
  const [customValue, setCustomValue] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const customInputRef = useRef<HTMLInputElement>(null)

  const handleAddCustom = () => {
    const trimmed = customValue.trim()
    if (!trimmed) return
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
    onAdd(formatted)
    setCustomValue('')
    setShowCustom(false)
  }

  useEffect(() => {
    if (showCustom) customInputRef.current?.focus()
  }, [showCustom])

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/60">
        <span className="text-muted-foreground"><TagIcon /></span>
        <div>
          <p className="text-[12px] font-semibold text-foreground">Variant attributes</p>
          <p className="text-[11px] text-muted-foreground">Choose which attributes define variants of this product (e.g. Size, Color)</p>
        </div>
      </div>

      <div className="px-4 py-3 flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {PREDEFINED_ATTRIBUTE_TYPES.map((attr) => {
            const isSelected = selected.includes(attr.name)
            return (
              <button
                key={attr.name}
                type="button"
                onClick={() => isSelected ? onRemove(attr.name) : onAdd(attr.name)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border transition-all duration-150',
                  isSelected
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white border-border text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                {isSelected && <CheckIcon />}
                {attr.name}
              </button>
            )
          })}

          {selected
            .filter((s) => !PREDEFINED_ATTRIBUTE_TYPES.find((p) => p.name === s))
            .map((name) => (
              <span
                key={name}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border bg-primary border-primary text-white"
              >
                {name}
                <button
                  type="button"
                  onClick={() => onRemove(name)}
                  className="opacity-70 hover:opacity-100 transition-opacity ml-0.5"
                >
                  <XIcon />
                </button>
              </span>
            ))}

          {showCustom ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={customInputRef}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddCustom() }
                  if (e.key === 'Escape') { setShowCustom(false); setCustomValue('') }
                }}
                placeholder="e.g. Style"
                className="rounded-full border border-border px-3 py-1 text-[11px] outline-hidden focus:border-ring focus:ring-2 focus:ring-ring w-28 transition-all"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                className="rounded-full border border-primary bg-primary text-white px-2.5 py-1 text-[11px] font-semibold hover:bg-primary/90 transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowCustom(false); setCustomValue('') }}
                className="rounded-full border border-border text-muted-foreground px-2.5 py-1 text-[11px] hover:border-border transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold border border-dashed border-border text-muted-foreground hover:border-border hover:text-muted-foreground transition-all"
            >
              <PlusIcon /> Custom
            </button>
          )}
        </div>

        {selected.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Each variant will have fields for:{' '}
            <span className="font-medium text-muted-foreground">{selected.join(', ')}</span>
          </p>
        )}

        {selected.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic">
            No attributes selected — variants will only differ by price and stock.
          </p>
        )}
      </div>
    </div>
  )
}

// VariantCard

export function VariantCard({
  index, onRemove, isOnly, attributeTypes, showVariantBadge = false,
}: {
  index: number
  onRemove: () => void
  isOnly: boolean
  attributeTypes: string[]
  // showVariantBadge: true in EditProductForm to show Existing/New chip
  showVariantBadge?: boolean
}) {
  const { register, watch, setValue, getValues, formState: { errors } } = useFormContext<any>()

  // react-hook-form can't type errors on numerically-indexed field arrays, so cast to read them.
  const variantErrors = (errors.variants as any)?.[index]

  const attributes: { attribute_name: string; attribute_value: string }[] =
    watch(`variants.${index}.attributes`) ?? []

  const filledValues = attributes.filter((a) => a.attribute_value).map((a) => a.attribute_value)
  const variantLabel = filledValues.length > 0 ? filledValues.join(' / ') : `Variant ${index + 1}`

  // variant_id present = existing variant being updated, absent = newly added
  const isExistingVariant = !!(watch(`variants.${index}`) as any)?.variant_id

  return (
    <div className="rounded-lg border border-border bg-muted/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-white">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">#{index + 1}</span>
          <span className="text-[12px] font-semibold text-muted-foreground truncate max-w-[160px]">{variantLabel}</span>
          {/* Only shown in edit context — indicates UPDATE vs INSERT to admin */}
          {showVariantBadge && (
            isExistingVariant ? (
              <span className="text-[9px] font-semibold uppercase tracking-wide bg-info-tint text-info border border-info/30 px-1.5 py-0.5 rounded-full">
                Existing
              </span>
            ) : (
              <span className="text-[9px] font-semibold uppercase tracking-wide bg-success-tint text-success border border-success/30 px-1.5 py-0.5 rounded-full">
                New
              </span>
            )
          )}
        </div>
        {!isOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-danger transition-colors font-medium"
          >
            <TrashIcon /> Remove
          </button>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price" required error={variantErrors?.price?.message as string | undefined}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground pointer-events-none font-medium select-none">₱</span>
              <Input
                {...register(`variants.${index}.price`, {
                  setValueAs: (v) => v === '' ? undefined : parseFloat(v),
                })}
                type="number" min={0} step={0.01} placeholder="0.00" className="pl-7"
              />
            </div>
          </Field>
          <Field label="Stock" error={variantErrors?.stock?.message as string | undefined}>
            <Input
              {...register(`variants.${index}.stock`, {
                setValueAs: (v) => v === '' ? undefined : parseInt(v, 10),
              })}
              type="number" min={0} step={1} placeholder="0"
            />
          </Field>
        </div>

        <Toggle
          checked={watch(`variants.${index}.is_active`) ?? true}
          onChange={(v) => setValue(`variants.${index}.is_active`, v)}
          label="Active"
          description="Make this variant available for purchase"
        />

        {attributeTypes.length > 0 && (
          <div className="flex flex-col gap-3">
            <SectionDivider label="Attributes" />
            {attributeTypes.map((attrName) => {
              const attrs: { attribute_name: string; attribute_value: string }[] =
                getValues(`variants.${index}.attributes`) ?? []
              const attrIdx = attrs.findIndex((a) => a.attribute_name === attrName)
              if (attrIdx === -1) return null

              const predefined = PREDEFINED_ATTRIBUTE_TYPES.find((p) => p.name === attrName)
              const hasOptions = predefined?.options && predefined.options.length > 0
              const fieldError = (variantErrors?.attributes as any)?.[attrIdx]?.attribute_value?.message as string | undefined

              return (
                <Field key={attrName} label={attrName} error={fieldError}>
                  {hasOptions ? (
                    <Select
                      {...register(`variants.${index}.attributes.${attrIdx}.attribute_value`)}
                      onChange={(e) => {
                        setValue(`variants.${index}.attributes.${attrIdx}.attribute_name`, attrName)
                        setValue(`variants.${index}.attributes.${attrIdx}.attribute_value`, e.target.value)
                      }}
                    >
                      <option value="">Select {attrName.toLowerCase()}…</option>
                      {predefined!.options!.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      {...register(`variants.${index}.attributes.${attrIdx}.attribute_value`)}
                      onChange={(e) => {
                        setValue(`variants.${index}.attributes.${attrIdx}.attribute_name`, attrName)
                        setValue(`variants.${index}.attributes.${attrIdx}.attribute_value`, e.target.value)
                      }}
                      placeholder={`Enter ${attrName.toLowerCase()}…`}
                    />
                  )}
                </Field>
              )
            })}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <SectionDivider label="Wholesale pricing" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Optionally set a wholesale discount for this variant. Customers who add{' '}
            <span className="font-medium text-muted-foreground">at least the minimum quantity</span>{' '}
            to their cart will automatically receive the discount.
          </p>
          <PricingTiersSection variantIndex={index} />
        </div>

        <div className="flex flex-col gap-2">
          <SectionDivider label="Images" />
          <ImageUploadZone variantIndex={index} />
        </div>
      </div>
    </div>
  )
}

// StepIndicator

export const STEPS = [
  { label: 'Basic info', description: 'Name, category, pricing' },
  { label: 'Variants', description: 'Stock, attributes, images' },
  { label: 'Details', description: 'Extra attributes' },
]

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-start gap-0 mb-6">
      {STEPS.map((step, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
            <div className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all duration-300 border',
              i < current
                ? 'bg-primary border-primary text-white'
                : i === current
                  ? 'bg-white border-primary text-foreground ring-4 ring-ring'
                  : 'bg-white border-border text-muted-foreground',
            )}>
              {i < current ? <CheckIcon /> : i + 1}
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className={cn(
                'text-[11px] font-semibold whitespace-nowrap transition-colors',
                i === current ? 'text-foreground' : i < current ? 'text-muted-foreground' : 'text-muted-foreground',
              )}>
                {step.label}
              </span>
              <span className={cn(
                'text-[10px] whitespace-nowrap hidden sm:block transition-colors',
                i === current ? 'text-muted-foreground' : 'text-muted-foreground',
              )}>
                {step.description}
              </span>
            </div>
          </div>

          {i < STEPS.length - 1 && (
            <div className="flex-1 mx-1 mt-3">
              <div className={cn('h-px transition-colors duration-500', i < current ? 'bg-primary' : 'bg-muted')} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// StepErrorBanner

export function StepErrorBanner({ errorCount }: { errorCount: number }) {
  if (errorCount === 0) return null
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5 mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
      <span className="text-danger shrink-0"><AlertIcon /></span>
      <p className="text-[12px] text-danger font-medium leading-snug">
        {errorCount === 1
          ? '1 field needs attention before continuing.'
          : `${errorCount} fields need attention before continuing.`}
      </p>
    </div>
  )
}

// Step1BasicInfo

export function Step1BasicInfo({ categories }: { categories: Category[] }) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<any>()

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    register('name').onChange(e)
    setValue(
      'slug',
      e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      { shouldValidate: true },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        {/* FIX: cast .message as string | undefined throughout Step1BasicInfo */}
        <Field label="Product name" required error={errors.name?.message as string | undefined}>
          <Input {...register('name')} onChange={handleNameChange} placeholder="e.g. Classic White Tee" />
        </Field>

        <Field label="Slug" required error={errors.slug?.message as string | undefined} hint="Auto-generated from name — editable">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-[11px] text-muted-foreground pointer-events-none select-none whitespace-nowrap font-medium">
              /products/
            </span>
            <Input {...register('slug')} className="pl-[74px]" placeholder="classic-white-tee" />
          </div>
        </Field>

        <Field label="Description" error={errors.description?.message as string | undefined}>
          <Textarea
            {...register('description')}
            placeholder="Describe your product — materials, fit, key features…"
            rows={3}
          />
        </Field>
      </div>

      <div className="h-px bg-muted" />

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" required error={errors.category_id?.message as string | undefined}>
            <Select
              {...register('category_id', {
                setValueAs: (v) => (v === '' ? undefined : Number(v)),
              })}
              value={watch('category_id') ?? ''}
              onChange={(e) => setValue('category_id', e.target.value === '' ? undefined : Number(e.target.value), { shouldValidate: true })}
            >
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Type" required error={errors.type?.message as string | undefined}>
            <Select
              {...register('type')}
              value={watch('type') ?? ''}
              onChange={(e) => setValue('type', e.target.value, { shouldValidate: true })}
            >
              <option value="">Select…</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Discount" error={errors.discount?.message as string | undefined} hint="Leave blank for no discount" className="max-w-[180px]">
          <div className="relative">
            <Input
              {...register('discount', { setValueAs: (v) => v === '' ? null : parseFloat(v) })}
              type="number" min={0} max={100} step={0.01} placeholder="0"
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground pointer-events-none select-none">%</span>
          </div>
        </Field>
      </div>

      <div className="h-px bg-muted" />

      <Toggle
        checked={watch('is_active') ?? true}
        onChange={(v) => setValue('is_active', v)}
        label="Active — visible in store"
        description="Customers will be able to find and purchase this product"
      />
    </div>
  )
}

// Step2Variants

export function Step2Variants({ showVariantBadge = false }: { showVariantBadge?: boolean }) {
  const { control, getValues, setValue, formState: { errors } } = useFormContext<any>()
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' })
  const [attributeTypes, setAttributeTypes] = useState<string[]>([])

  useEffect(() => {
    const existingVariants: any[] = getValues('variants') ?? []
    if (existingVariants.length > 0) {
      const names = (existingVariants[0].attributes ?? [])
        .map((a: any) => a.attribute_name)
        .filter(Boolean)
      if (names.length > 0) setAttributeTypes(names)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddAttributeType = (name: string) => {
    if (attributeTypes.includes(name)) return
    setAttributeTypes((prev) => [...prev, name])
    fields.forEach((_, i) => {
      const currentAttrs: any[] = getValues(`variants.${i}.attributes`) ?? []
      setValue(`variants.${i}.attributes`, [
        ...currentAttrs,
        { attribute_name: name, attribute_value: '' },
      ])
    })
  }

  const handleRemoveAttributeType = (name: string) => {
    setAttributeTypes((prev) => prev.filter((t) => t !== name))
    fields.forEach((_, i) => {
      const currentAttrs: any[] = getValues(`variants.${i}.attributes`) ?? []
      setValue(`variants.${i}.attributes`, currentAttrs.filter((a: any) => a.attribute_name !== name))
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <AttributeTypeSelector
        selected={attributeTypes}
        onAdd={handleAddAttributeType}
        onRemove={handleRemoveAttributeType}
      />

      {errors.variants?.root && (
        <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5">
          <span className="text-danger"><AlertIcon /></span>
          <p className="text-[12px] text-danger font-medium">{(errors.variants.root as any).message}</p>
        </div>
      )}

      {fields.map((field, idx) => (
        <VariantCard
          key={field.id}
          index={idx}
          isOnly={fields.length === 1}
          onRemove={() => remove(idx)}
          attributeTypes={attributeTypes}
          showVariantBadge={showVariantBadge}
        />
      ))}

      <button
        type="button"
        onClick={() => append(makeBlankVariant(attributeTypes))}
        className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-[12px] font-medium text-muted-foreground hover:border-border hover:text-muted-foreground hover:bg-muted/60 transition-all"
      >
        <PlusIcon /> Add variant
      </button>
    </div>
  )
}

// Step3Details
// Supports both `details` (AddProductForm) and `product_details` (EditProductForm)
// by reading whichever key is present in the form.

export function Step3Details({ fieldName = 'details' }: { fieldName?: 'details' | 'product_details' }) {
  const { register, control, formState: { errors } } = useFormContext<any>()
  const { fields, append, remove } = useFieldArray({ control, name: fieldName })
  const fieldErrors = (errors as any)[fieldName]

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-border bg-muted px-4 py-3">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Add structured attributes shown on the product page — e.g.{' '}
          <span className="font-medium text-foreground">Material</span>,{' '}
          <span className="font-medium text-foreground">Care Instructions</span>,{' '}
          <span className="font-medium text-foreground">Country of Origin</span>.
          These are displayed as a spec table to customers.
        </p>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-10 flex flex-col items-center gap-2 text-center">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">No details added</span>
          <p className="text-[11px] text-muted-foreground max-w-[200px]">
            Optional — skip this step if you don&apos;t have extra specs to display
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Attribute</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Value</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Order</span>
          </div>

          {fields.map((field, idx) => (
            <div key={field.id} className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 items-start">
              <Field label="" error={(fieldErrors?.[idx] as any)?.attribute_name?.message as string | undefined}>
                <Input {...register(`${fieldName}.${idx}.attribute_name`)} placeholder="Material" />
              </Field>
              <Field label="" error={(fieldErrors?.[idx] as any)?.attribute_value?.message as string | undefined}>
                <Input {...register(`${fieldName}.${idx}.attribute_value`)} placeholder="100% Cotton" />
              </Field>
              <Input
                {...register(`${fieldName}.${idx}.sort_order`, { valueAsNumber: true })}
                type="number" min={0} placeholder="0"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="mt-1.5 p-1.5 rounded text-muted-foreground hover:text-danger hover:bg-danger-tint transition-colors"
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
        className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-[12px] font-medium text-muted-foreground hover:border-border hover:text-muted-foreground hover:bg-muted/60 transition-all w-full"
      >
        <PlusIcon /> Add detail
      </button>
    </div>
  )
}