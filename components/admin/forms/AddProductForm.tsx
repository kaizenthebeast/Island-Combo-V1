'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addProductSchema, AddProductFormValues } from '@/form-schema/addProductSchema'
import { cn } from '@/lib/utils'

// ─── Icons ────────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="7" y1="1" x2="7" y2="13" /><line x1="1" y1="7" x2="13" y2="7" />
  </svg>
)
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
)
const ChevronRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
const ChevronLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const ImageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)
const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

// ─── Shared components ────────────────────────────────────────────────────────
function Field({ label, error, children, required, hint }: {
  label: string; error?: string; children: React.ReactNode; required?: boolean; hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
        {label}{required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="text-[11px] text-rose-500">{error}</p>}
    </div>
  )
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none',
        'placeholder:text-slate-300',
        'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100',
        'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
        'transition-all duration-150',
        className
      )}
      {...props}
    />
  )
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      className={cn(
        'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none resize-none',
        'placeholder:text-slate-300',
        'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100',
        'transition-all duration-150',
        className
      )}
      {...props}
    />
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2.5">
      <span className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200',
        checked ? 'bg-indigo-500' : 'bg-slate-200'
      )}>
        <span
          className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </span>
      <span className="text-sm text-slate-600">{label}</span>
    </button>
  )
}

// ─── Image Upload Zone ────────────────────────────────────────────────────────
function ImageUploadZone({ variantIndex }: { variantIndex: number }) {
  const { control, setValue, watch } = useFormContext<AddProductFormValues>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: `variants.${variantIndex}.images`,
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const currentCount = fields.length
    Array.from(files).forEach((file, i) => {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) return
      const preview = URL.createObjectURL(file)
      append({
        file,
        preview,
        is_primary: currentCount === 0 && i === 0,
        sort_order: currentCount + i,
      })
    })
  }, [append, fields.length])

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
    <div className="flex flex-col gap-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-5 cursor-pointer transition-all duration-200',
          dragging
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40'
        )}
      >
        <div className="text-slate-300"><ImageIcon /></div>
        <p className="text-xs text-slate-500 font-medium">
          Drop images here or <span className="text-indigo-500">click to browse</span>
        </p>
        <p className="text-[11px] text-slate-400">JPEG, PNG, WebP, GIF · Max 5 MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {fields.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {fields.map((field, idx) => {
            const img = watch(`variants.${variantIndex}.images.${idx}`)
            return (
              <div key={field.id} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img?.preview} alt="" className="w-full h-full object-cover" />
                {img?.is_primary && (
                  <div className="absolute top-1 left-1 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-tight">
                    Primary
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPrimary(idx)}
                    title="Set as primary"
                    className={cn(
                      'p-1.5 rounded-full transition-colors',
                      img?.is_primary ? 'text-amber-400' : 'text-white/80 hover:text-amber-400'
                    )}
                  >
                    <StarIcon filled={img?.is_primary ?? false} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    title="Remove"
                    className="p-1.5 rounded-full text-white/80 hover:text-rose-400 transition-colors"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Variant Card ─────────────────────────────────────────────────────────────
function VariantCard({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { register, control, watch, setValue, formState: { errors } } = useFormContext<AddProductFormValues>()
  const { fields: attrFields, append: appendAttr, remove: removeAttr } = useFieldArray({
    control,
    name: `variants.${index}.attributes`,
  })
  const variantErrors = errors.variants?.[index]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">
          Variant {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-500 transition-colors"
        >
          <TrashIcon /> Remove
        </button>
      </div>

      {/* Price / Stock */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price" required error={variantErrors?.price?.message}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₱</span>
            <Input
              {...register(`variants.${index}.price`, { valueAsNumber: true })}
              type="number" min={0} step={0.01} placeholder="0.00"
              className="pl-7"
            />
          </div>
        </Field>
        <Field label="Stock" error={variantErrors?.stock?.message}>
          <Input
            {...register(`variants.${index}.stock`, { valueAsNumber: true })}
            type="number" min={0} step={1} placeholder="0"
          />
        </Field>
      </div>

      <Toggle
        checked={watch(`variants.${index}.is_active`) ?? true}
        onChange={v => setValue(`variants.${index}.is_active`, v)}
        label="Variant active"
      />

      {/* Attributes */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Attributes</span>
          <button
            type="button"
            onClick={() => appendAttr({ attribute_name: '', attribute_value: '' })}
            className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
          >
            <PlusIcon /> Add
          </button>
        </div>
        {variantErrors?.attributes?.root && (
          <p className="text-[11px] text-rose-500">{variantErrors.attributes.root.message}</p>
        )}
        {attrFields.length === 0 && (
          <p className="text-xs text-slate-400 italic">Add attributes like Color, Size…</p>
        )}
        {attrFields.map((field, attrIdx) => {
          const attrErr = variantErrors?.attributes?.[attrIdx]
          return (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1">
                <Input
                  {...register(`variants.${index}.attributes.${attrIdx}.attribute_name`)}
                  placeholder="e.g. Color"
                />
                {attrErr?.attribute_name && (
                  <p className="text-[11px] text-rose-500 mt-0.5">{attrErr.attribute_name.message}</p>
                )}
              </div>
              <div className="flex-1">
                <Input
                  {...register(`variants.${index}.attributes.${attrIdx}.attribute_value`)}
                  placeholder="e.g. Red"
                />
                {attrErr?.attribute_value && (
                  <p className="text-[11px] text-rose-500 mt-0.5">{attrErr.attribute_value.message}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAttr(attrIdx)}
                className="mt-1 p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
              >
                <TrashIcon />
              </button>
            </div>
          )
        })}
      </div>

      {/* Images */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Images</span>
        <ImageUploadZone variantIndex={index} />
      </div>
    </div>
  )
}


// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = ['Basic Info', 'Variants', 'Details']

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-7">
      {STEPS.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1 min-w-[60px]">
            <div className={cn(
              'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
              i < current ? 'bg-indigo-500 text-white' :
              i === current ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
              'bg-slate-100 text-slate-400'
            )}>
              {i < current ? <CheckIcon /> : i + 1}
            </div>
            <span className={cn(
              'text-[10px] font-bold uppercase tracking-wider whitespace-nowrap',
              i === current ? 'text-indigo-600' : i < current ? 'text-indigo-400' : 'text-slate-300'
            )}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn(
              'h-px flex-1 mx-1 mb-4 transition-all duration-500',
              i < current ? 'bg-indigo-400' : 'bg-slate-200'
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── STEP 1: Basic Info ───────────────────────────────────────────────────────
const MOCK_CATEGORIES = [
  { category_id: 1, name: 'Apparel' },
  { category_id: 2, name: 'Footwear' },
  { category_id: 3, name: 'Accessories' },
  { category_id: 4, name: 'Electronics' },
]

function Step1BasicInfo() {
  const { register, setValue, watch, formState: { errors } } = useFormContext<AddProductFormValues>()

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    register('name').onChange(e)
    const slug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setValue('slug', slug, { shouldValidate: true })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Product Name" required error={errors.name?.message}>
        <Input {...register('name')} onChange={handleNameChange} placeholder="e.g. Classic White Tee" />
      </Field>

      <Field label="Slug" required error={errors.slug?.message} hint="Auto-generated from name, but editable">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-300 pointer-events-none select-none">/products/</span>
          <Input {...register('slug')} className="pl-[76px]" placeholder="classic-white-tee" />
        </div>
      </Field>

      <Field label="Description" error={errors.description?.message}>
        <Textarea {...register('description')} placeholder="Describe your product…" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category" required error={errors.category_id?.message}>
          <select
            {...register('category_id', { valueAsNumber: true })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          >
            <option value="">Select category</option>
            {MOCK_CATEGORIES.map(c => (
              <option key={c.category_id} value={c.category_id}>{c.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Type" required error={errors.type?.message}>
          <Input {...register('type')} placeholder="e.g. Physical, Digital" />
        </Field>
      </div>

      <Field label="Discount (%)" error={errors.discount?.message}>
        <Input
          {...register('discount', { setValueAs: v => v === '' ? null : parseFloat(v) })}
          type="number" min={0} max={100} step={0.01} placeholder="0"
          className="max-w-[160px]"
        />
      </Field>

      <div className="flex flex-col gap-2.5 pt-1">
        <Toggle
          checked={watch('is_active') ?? true}
          onChange={v => setValue('is_active', v)}
          label="Active — visible in store"
        />
        <Toggle
          checked={watch('wholesale') ?? false}
          onChange={v => setValue('wholesale', v)}
          label="Wholesale product"
        />
      </div>
    </div>
  )
}

// ─── STEP 2: Variants ─────────────────────────────────────────────────────────
function Step2Variants() {
  const { control, formState: { errors } } = useFormContext<AddProductFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' })

  return (
    <div className="flex flex-col gap-4">
      {errors.variants?.root && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-600">
          {errors.variants.root.message}
        </div>
      )}
      {fields.map((field, idx) => (
        <VariantCard key={field.id} index={idx} onRemove={() => remove(idx)} />
      ))}
      <button
        type="button"
        onClick={() => append({
          price: 0,
          stock: 0,
          is_active: true,
          attributes: [{ attribute_name: '', attribute_value: '' }],
          images: [],
        })}
        className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 py-3 text-sm font-medium text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
      >
        <PlusIcon /> Add Variant
      </button>
    </div>
  )
}

// ─── STEP 3: Details ──────────────────────────────────────────────────────────
function Step3Details() {
  const { register, control, formState: { errors } } = useFormContext<AddProductFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'details' })

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Add extra product attributes shown on the product page — e.g.{' '}
        <span className="text-slate-700 font-medium">Material</span>,{' '}
        <span className="text-slate-700 font-medium">Care Instructions</span>,{' '}
        <span className="text-slate-700 font-medium">Origin</span>.
      </p>

      {fields.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-8 flex flex-col items-center gap-1.5 text-slate-300">
          <span className="text-3xl">📋</span>
          <span className="text-xs font-medium">No details yet</span>
        </div>
      )}

      {fields.map((field, idx) => (
        <div key={field.id} className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 items-start">
          <div>
            <Input
              {...register(`details.${idx}.attribute_name`)}
              placeholder="Attribute (e.g. Material)"
            />
            {errors.details?.[idx]?.attribute_name && (
              <p className="text-[11px] text-rose-500 mt-0.5">{errors.details[idx]?.attribute_name?.message}</p>
            )}
          </div>
          <div>
            <Input
              {...register(`details.${idx}.attribute_value`)}
              placeholder="Value (e.g. Cotton)"
            />
            {errors.details?.[idx]?.attribute_value && (
              <p className="text-[11px] text-rose-500 mt-0.5">{errors.details[idx]?.attribute_value?.message}</p>
            )}
          </div>
          <Input
            {...register(`details.${idx}.sort_order`, { valueAsNumber: true })}
            type="number" min={0} placeholder="Order"
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            className="mt-1.5 p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
          >
            <TrashIcon />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => append({ attribute_name: '', attribute_value: '', sort_order: fields.length })}
        className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 py-3 text-sm font-medium text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
      >
        <PlusIcon /> Add Detail
      </button>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────
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
      variants: [{
        price: 0,
        stock: 0,
        is_active: true,
        attributes: [{ attribute_name: '', attribute_value: '' }],
        images: [],
      }],
      details: [],
    },
    mode: 'onTouched',
  })

  const { trigger } = methods

  const goNext = async () => {
    const valid = await trigger(STEP_FIELDS[step] as any)
    if (valid) setStep(s => s + 1)
  }

  const handleSave = async () => {
    // TODO: wire up your Supabase insert here
    const data = methods.getValues()
    console.log('Save product:', data)
  }

  return (
    <FormProvider {...methods}>
      <form className="flex flex-col">
        <StepIndicator current={step} />

        <div className="max-h-[52vh] overflow-y-auto pr-1 pb-2 -mr-1">
          {step === 0 && <Step1BasicInfo />}
          {step === 1 && <Step2Variants />}
          {step === 2 && <Step3Details />}
        </div>

        <div className="flex items-center justify-between pt-5 mt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors"
          >
            {step === 0 ? 'Cancel' : <><ChevronLeft /> Back</>}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95 transition-all"
            >
              Next <ChevronRight />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <CheckIcon /> Save Product
            </button>
          )}
        </div>
      </form>
    </FormProvider>
  )
}

export default AddProductForm