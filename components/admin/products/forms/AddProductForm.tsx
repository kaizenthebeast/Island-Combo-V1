'use client'

import React, { useState, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addProductSchema, AddProductFormValues } from '@/form-schema/addProductSchema'
import { uploadVariantImages } from '@/lib/product-upload'

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

const STEP_FIELDS: (keyof AddProductFormValues)[][] = [
  ['name', 'slug', 'description', 'category_id', 'type', 'discount', 'is_active'],
  ['variants'],
  ['details'],
]

// --- Props -------------------------------------------------------------------

interface AddProductFormProps {
  onSuccess?: (data: AddProductFormValues) => void
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
  const methods = useForm<AddProductFormValues>({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      is_active: true,
      discount: null,
      type: '',
      variants: [makeBlankVariant([])],
      details: [],
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

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={step === 0 ? onCancel : goBack}
            className="flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            {step === 0 ? 'Cancel' : <><ChevronLeft /> Back</>}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-300 mr-1 select-none">
              {step + 1} / {STEP_FIELDS.length}
            </span>

            {step < STEP_FIELDS.length - 1 ? (
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