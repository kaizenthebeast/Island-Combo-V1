'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductFormValues } from '@/form-schema/productSchema'
import { uploadVariantImages } from '@/lib/product-upload'
import type { AdminProduct } from '@/types/product'
import { getPublicImageUrl } from '@/helper/getPublicImageUrl'

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
  type Category,
} from './ProductUIForm'

// --- Constants ---------------------------------------------------------------

const STEP_FIELDS: (keyof ProductFormValues)[][] = [
  ['name', 'slug', 'description', 'category_id', 'type', 'discount', 'status'],
  ['variants'],
  ['product_details'],
]

// --- Helper: derive status from product data ---------------------------------
// Handles legacy `is_active` boolean shape from AdminProduct until the type
// is updated to reflect the new DB enum.

function deriveStatus(product: AdminProduct): ProductFormValues['status'] {
  const valid = ['ACTIVE', 'DRAFT', 'HIDDEN', 'ARCHIVED']
  if (valid.includes(product.status)) return product.status as ProductFormValues['status']
  return 'ACTIVE'
}

// --- Map AdminProduct -> form default values ----------------------------------

function toFormValues(product: AdminProduct): ProductFormValues {
  return {
    product_id: product.product_id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? undefined,
    status: deriveStatus(product),
    discount: product.discount,
    category_id: product.category?.category_id,
    type: product.type,

    product_details: product.product_details.map((d) => ({
      id: d.id,
      attribute_name: d.attribute_name,
      attribute_value: d.attribute_value,
      sort_order: 0,  // AdminProduct.product_details has no sort_order; default to 0
    })),

    deleted_detail_ids: [],
    deleted_variant_ids: [],

    variants: product.variants.map((v) => ({
      variant_id: v.variant_id,
      sku: v.sku,
      price: v.price,
      stock: v.stock ?? 0,
      is_active: v.is_active ?? true,
      pricing_tiers: v.pricing_tiers
        .filter((t) => t.label === 'wholesale')
        .map((t) => ({
          // PricingTier has no id; omit so the RPC treats it as a new/replace
          label: 'wholesale' as const,
          min_quantity: t.min_quantity,
          discount_percent: t.discount_percent,
        })),
      deleted_tier_ids: [],
      attributes: v.attributes.map((a) => ({
        id: a.id,
        attribute_name: a.name,
        attribute_value: a.value,
      })),
      deleted_attribute_ids: [],
      images: v.images.map((url, i) => ({
        preview: getPublicImageUrl(url) ?? url,
        is_primary: i === 0,
        sort_order: i,
        path: url,
      })),
      deleted_image_paths: [],
    })),
  }
}

// --- Props -------------------------------------------------------------------

interface EditProductFormProps {
  product: AdminProduct
  onSuccess: () => void
  onCancel: () => void
}

// --- Component ---------------------------------------------------------------

export function EditProductForm({ product, onSuccess, onCancel }: EditProductFormProps) {
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [stepErrorCount, setStepErrorCount] = useState(0)

  // Fetch sub-categories from API.
  useEffect(() => {
    fetch('/api/category')
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message)
        const subs = (json.data as { id: number; name: string; parent_id: number | null }[])
          .filter((c) => c.parent_id !== null) as unknown as Category[]
        setCategories(subs)
      })
      .finally(() => setLoadingCategories(false))
  }, [])

  const methods = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: toFormValues(product),
    mode: 'onTouched',
  })

  const { trigger, formState: { errors, isDirty } } = methods

  useEffect(() => {
    const count = STEP_FIELDS[step].filter((k) => !!errors[k as keyof typeof errors]).length
    setStepErrorCount(count)
  }, [errors, step])

  const goNext = async () => {
    const valid = await trigger(STEP_FIELDS[step] as any)
    if (valid) { setStep((s) => s + 1); setStepErrorCount(0) }
  }

  const goBack = () => {
    setStep((s) => s - 1)
    setStepErrorCount(0)
    setSaveError(null)
  }

  const handleSave = () => {
    startTransition(async () => {
      setSaveError(null)

      try {
        const data = methods.getValues()

        // Step 1: Upload new images for all variants
        const variantUploadedPaths: Record<number, string[]> = {}

        for (let i = 0; i < data.variants.length; i++) {
          const variant = data.variants[i]
          const images = variant.images ?? []
          const newImages = images.filter((img) => !!img.file)

          if (newImages.length > 0) {
            const uploaded = await uploadVariantImages([
              {
                ...variant,
                images: newImages as any,
                stock: variant.stock ?? 0,
                is_active: variant.is_active ?? true,
                attributes: variant.attributes ?? [],
                pricing_tiers: (variant.pricing_tiers ?? []).map((t) => ({
                  ...t,
                  label: t.label ?? 'wholesale',
                })),
              },
            ])
            variantUploadedPaths[i] = uploaded[0]?.images.map((img) => img.url) ?? []
          } else {
            variantUploadedPaths[i] = []
          }
        }

        // Step 2: PATCH /api/product with the full resolved payload
        const res = await fetch('/api/product', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: product.product_id,
            name: data.name,
            slug: data.slug,
            description: data.description,
            status: data.status,           // ← was is_active; now sends status enum
            discount: data.discount,
            category_id: data.category_id,
            type: data.type,
            product_details: data.product_details,
            deleted_detail_ids: data.deleted_detail_ids,

            variants: data.variants.map((variant, i) => {
              const images = variant.images ?? []

              const existingPaths = images
                .filter((img) => !img.file && img.path)
                .map((img) => img.path as string)

              const allImagePaths = [...existingPaths, ...variantUploadedPaths[i]]

              return {
                variant_id: variant.variant_id,
                sku: variant.sku,
                price: variant.price,
                stock: variant.stock ?? 0,
                is_active: variant.is_active ?? true,
                pricing_tiers: (variant.pricing_tiers ?? []).map((t) => ({
                  id: t.id,
                  label: t.label ?? 'wholesale',
                  min_quantity: t.min_quantity,
                  discount_percent: t.discount_percent,
                })),
                deleted_tier_ids: variant.deleted_tier_ids ?? [],
                attributes: (variant.attributes ?? []).map((a) => ({
                  id: a.id,
                  attribute_name: a.attribute_name,
                  attribute_value: a.attribute_value,
                })),
                deleted_attribute_ids: variant.deleted_attribute_ids ?? [],
                images: allImagePaths,
                deleted_image_paths: variant.deleted_image_paths ?? [],
              }
            }),

            deleted_variant_ids: data.deleted_variant_ids,
          }),
        })

        const json = await res.json()
        if (!json.success) throw new Error(json.message)

        onSuccess()
      } catch (err: any) {
        setSaveError(err.message ?? 'Something went wrong.')
      }
    })
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

        <div className="max-h-[54vh] overflow-y-auto pr-1 -mr-1">
          {step === 0 && <Step1BasicInfo categories={loadingCategories ? [] : categories} />}
          {step === 1 && <Step2Variants showVariantBadge />}
          {step === 2 && <Step3Details fieldName="product_details" />}
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
                disabled={isPending || !isDirty}
                className="flex items-center gap-2 rounded-md bg-slate-800 px-5 py-2 text-[13px] font-semibold text-white hover:bg-slate-900 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {isPending ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saving...
                  </>
                ) : (
                  <><CheckIcon /> Save changes</>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </FormProvider>
  )
}

export default EditProductForm