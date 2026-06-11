'use client'

import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog'
import { Field, Input, Select, Textarea } from '@/shared/components/admin/FormField'
import { PromoImageField } from './PromoImageField'
import {
  bannerFormSchema,
  promotionAdFormSchema,
  type BannerFormValues,
} from '@/features/banners/validations/banner'
import { uploadPromoImage, removePromoImage } from '@/features/banners/api/admin/promo-image-upload'
import type { PromoImageKind } from '@/shared/config/promo-images'
import {
  AD_PLACEMENT_LABELS,
  type AdPlacement,
  type BannerWithImage,
  type PromotionAdWithImage,
} from '@/shared/types/banner'

// One dialog for all four modes (add/edit × banner/ad): the two content types
// share every field except the ad's `placement`.
//
// Submit order matters: the image uploads first (strictly validated, returns a
// bare storage path), then the row is saved with that path via the admin API
// route. If the save fails, the just-uploaded file is removed so the private
// bucket never accumulates orphans.

type FormValues = BannerFormValues & { placement?: AdPlacement }

const KIND_CONFIG = {
  banner: { label: 'Hero Banner',  endpoint: '/api/admin/banner' },
  ad:     { label: 'Promotion Ad', endpoint: '/api/admin/promotion-ad' },
} as const

type Props = {
  kind: PromoImageKind
  open: boolean
  onClose: () => void
  /** Row being edited — omit (null) to create. */
  item?: BannerWithImage | PromotionAdWithImage | null
  /** Called after a successful save (parent refreshes + closes). */
  onSaved: () => void
}

const toDateInput  = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null)
const emptyToNull  = (v: string | null) => {
  const trimmed = v?.trim()
  return trimmed ? trimmed : null
}

export function PromoContentFormDialog({ kind, open, onClose, item, onSaved }: Props) {
  const { label, endpoint } = KIND_CONFIG[kind]
  const isEdit = !!item

  const [imageFile, setImageFile]   = useState<File | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  const defaults = (): FormValues => ({
    title:         item?.title ?? '',
    description:   item?.description ?? null,
    cta_label:     item?.cta_label ?? null,
    cta_url:       item?.cta_url ?? null,
    start_date:    toDateInput(item?.start_date),
    end_date:      toDateInput(item?.end_date),
    display_order: item?.display_order ?? 0,
    is_active:     item?.is_active ?? true,
    ...(kind === 'ad'
      ? { placement: (item as PromotionAdWithImage | null | undefined)?.placement ?? 'landing' }
      : {}),
  })

  const resolver = (
    kind === 'ad' ? zodResolver(promotionAdFormSchema) : zodResolver(bannerFormSchema)
  ) as Resolver<FormValues>

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({ resolver, defaultValues: defaults() })

  // Re-seed whenever the dialog opens for a different row (or switches add/edit).
  useEffect(() => {
    if (!open) return
    reset(defaults())
    setImageFile(null)
    setImageError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item])

  const onSubmit = async (values: FormValues) => {
    const existingPath = item?.image_url ?? null
    if (!imageFile && !existingPath) {
      setImageError('An image is required.')
      return
    }
    setImageError(null)

    let uploadedPath: string | null = null
    try {
      const imagePath = imageFile
        ? (uploadedPath = await uploadPromoImage(imageFile, kind))
        : (existingPath as string)

      const payload = {
        title:         values.title.trim(),
        description:   emptyToNull(values.description),
        image_url:     imagePath,
        cta_label:     emptyToNull(values.cta_label),
        cta_url:       emptyToNull(values.cta_url),
        start_date:    values.start_date ? new Date(values.start_date).toISOString() : null,
        // End date is inclusive — the content stays live through that whole day.
        end_date:      values.end_date ? new Date(`${values.end_date}T23:59:59.999`).toISOString() : null,
        display_order: values.display_order,
        is_active:     values.is_active,
        ...(kind === 'ad' ? { placement: values.placement } : {}),
      }

      const res = await fetch(endpoint, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEdit
            ? {
                id: item!.id,
                ...payload,
                // old file becomes unreferenced once the row points at the new one
                replacedImagePath: uploadedPath && existingPath !== uploadedPath ? existingPath : null,
              }
            : payload,
        ),
      })
      const json = (await res.json()) as { success: boolean; message?: string }
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Something went wrong — please try again.')
      }

      onSaved()
    } catch (err) {
      // The row never saved, so a freshly uploaded image is an orphan — drop it.
      if (uploadedPath) void removePromoImage(uploadedPath)
      uploadedPath = null
      setError('root', {
        message: err instanceof Error ? err.message : 'Something went wrong — please try again.',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${label}` : `Create ${label}`}</DialogTitle>
          <DialogDescription>
            {kind === 'banner'
              ? 'Full-width rotating banner shown at the top of the homepage.'
              : 'Promotional strip shown on the page chosen under placement.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {errors.root && (
            <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5">
              <p className="text-[12px] text-danger font-medium">{errors.root.message}</p>
            </div>
          )}

          <Field label="Title" required error={errors.title?.message}>
            <Input {...register('title')} placeholder="e.g. Christmas Big Sale" autoComplete="off" />
          </Field>

          <Field label="Description" error={errors.description?.message} hint="Optional — shown under the title">
            <Textarea
              {...register('description', { setValueAs: (v) => (v === '' ? null : v) })}
              placeholder="e.g. Up to 60% off storewide"
            />
          </Field>

          <PromoImageField
            kind={kind}
            existingUrl={item?.image_src}
            file={imageFile}
            onFileChange={(file) => { setImageFile(file); setImageError(null) }}
            error={imageError}
          />

          {kind === 'ad' && (
            <Field label="Placement" required error={errors.placement?.message} hint="Which page this ad appears on">
              <Select {...register('placement')}>
                {(Object.keys(AD_PLACEMENT_LABELS) as AdPlacement[]).map((placement) => (
                  <option key={placement} value={placement}>{AD_PLACEMENT_LABELS[placement]}</option>
                ))}
              </Select>
            </Field>
          )}

          <div className="h-px bg-muted" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Button Label" error={errors.cta_label?.message} hint="Optional — e.g. “Shop Now”">
              <Input {...register('cta_label', { setValueAs: (v) => (v === '' ? null : v) })} placeholder="None" />
            </Field>
            <Field label="Button Link" error={errors.cta_url?.message} hint="Full URL or site path">
              <Input {...register('cta_url', { setValueAs: (v) => (v === '' ? null : v) })} placeholder="/products" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date" error={errors.start_date?.message} hint="Optional — goes live immediately if blank">
              <Input {...register('start_date', { setValueAs: (v) => (v === '' ? null : v) })} type="date" />
            </Field>
            <Field label="End Date" error={errors.end_date?.message} hint="Optional — never expires if blank">
              <Input {...register('end_date', { setValueAs: (v) => (v === '' ? null : v) })} type="date" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <Field label="Display Order" error={errors.display_order?.message} hint="Lower numbers show first">
              <Input {...register('display_order', { valueAsNumber: true })} type="number" min={0} step={1} />
            </Field>
            <label className="flex items-center gap-2 pb-6 text-[13px] font-medium text-foreground select-none cursor-pointer">
              <input type="checkbox" {...register('is_active')} className="h-4 w-4 accent-primary" />
              Active
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : `Create ${label}`}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
