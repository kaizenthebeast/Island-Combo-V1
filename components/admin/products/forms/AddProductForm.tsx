'use client'

import React, { useState, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductFormValues } from '@/lib/validators/product'
import { uploadVariantImages } from '@/lib/admin/products/product-upload'

import {
  StepIndicator,
  StepErrorBanner,
  Step1BasicInfo,
  Step2Variants,
  Step3Details,
  ChevronLeft,
  ChevronRight,
  CheckIcon,
  AlertIcon,
  makeBlankVariant,
  type Category,
} from './ProductUIForm'

// --- Constants ---------------------------------------------------------------

const STEP_FIELDS: (keyof ProductFormValues)[][] = [
  ['name', 'slug', 'description', 'category_id', 'type', 'discount', 'status'],
  ['variants'],
  ['product_details'],
]

// --- Props -------------------------------------------------------------------

interface AddProductFormProps {
  onSuccess?: (data: ProductFormValues) => void
  onCancel?: () => void
}

// --- Component ---------------------------------------------------------------

export const AddProductForm = ({ onSuccess, onCancel }: AddProductFormProps) => {
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [stepErrorCount, setStepErrorCount] = useState(0)

  // Fetch sub-categories from API.
  // /api/category returns all categories; filter to sub-categories (parent_id != null)
  // on the raw response before casting, so we never touch the local Category type.
  useEffect(() => {
    fetch('/api/category')
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message)
        const subs = (json.data as { id: number; name: string; parent_id: number | null }[])
          .filter((c) => c.parent_id !== null) as unknown as Category[]
        setCategories(subs)
      })
      .catch((err) => setCategoryError(err.message))
      .finally(() => setLoadingCategories(false))
  }, [])

  // Form setup
  const methods = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      status: 'ACTIVE',       // replaces is_active: true
      discount: null,
      type: '',
      category_id: undefined,
      product_details: [],    // was `details`
      deleted_detail_ids: [],
      deleted_variant_ids: [],
      variants: [makeBlankVariant([])],
    },
    mode: 'onTouched',
  })

  const { trigger, formState: { errors } } = methods

  useEffect(() => {
    const count = STEP_FIELDS[step].filter((k) => !!errors[k]).length
    setStepErrorCount(count)
  }, [errors, step])

  // Navigation
  const goNext = async () => {
    const valid = await trigger(STEP_FIELDS[step] as any)
    if (valid) { setStep((s) => s + 1); setStepErrorCount(0) }
  }

  const goBack = () => {
    setStep((s) => s - 1)
    setStepErrorCount(0)
    setSaveError(null)
  }

  // Submit
  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const data = methods.getValues()
      const variantsWithPaths = await uploadVariantImages(data.variants)

      const res = await fetch('/api/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, variants: variantsWithPaths }),
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.message)

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
          <div className="flex items-center gap-2.5 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5 mb-4">
            <span className="text-danger shrink-0"><AlertIcon /></span>
            <p className="text-[12px] text-danger font-medium">{saveError}</p>
          </div>
        )}

        {categoryError && (
          <div className="flex items-center gap-2.5 rounded-md border border-warning/30 bg-warning-tint px-3 py-2.5 mb-4">
            <span className="text-warning shrink-0"><AlertIcon /></span>
            <p className="text-[12px] text-warning">Could not load categories: {categoryError}</p>
          </div>
        )}

        <div className="max-h-[54vh] overflow-y-auto pr-1 -mr-1">
          {step === 0 && <Step1BasicInfo categories={loadingCategories ? [] : categories} />}
          {step === 1 && <Step2Variants />}
          {step === 2 && <Step3Details fieldName="product_details" />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
          <button
            type="button"
            onClick={step === 0 ? onCancel : goBack}
            className="flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {step === 0 ? 'Cancel' : <><ChevronLeft /> Back</>}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground mr-1 select-none">
              {step + 1} / {STEP_FIELDS.length}
            </span>

            {step < STEP_FIELDS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="flex items-center gap-1.5 rounded-md bg-primary px-5 py-2 text-[13px] font-semibold text-white hover:bg-primary/90 active:scale-[0.97] transition-all"
              >
                Continue <ChevronRight />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-[13px] font-semibold text-white hover:bg-primary/90 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {saving ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saving...
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