'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, X } from 'lucide-react'
import { Field } from '@/shared/components/admin/FormField'
import { validatePromoImage } from '@/features/banners/api/admin/promo-image-upload'
import { PROMO_IMAGE_SPECS, describePromoImageSpec, type PromoImageKind } from '@/shared/config/promo-images'

type Props = {
  kind: PromoImageKind
  /** Signed URL of the already-stored image (edit mode). */
  existingUrl?: string | null
  file: File | null
  onFileChange: (file: File | null) => void
  /** Parent-owned error (e.g. "image required" raised at submit). */
  error?: string | null
}

/** File picker that enforces the STRICT size spec for its kind: a file whose
 *  pixel dimensions don't match exactly is rejected on selection and never
 *  reaches the form state (let alone the bucket). */
export function PromoImageField({ kind, existingUrl, file, onFileChange, error }: Props) {
  const spec = PROMO_IMAGE_SPECS[kind]
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // The picked file's object URL is created in the handlers below; this only
  // revokes the previous URL once it's been replaced (and the last on unmount).
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview) }
  }, [preview])

  const handlePick = async (picked: File | undefined) => {
    if (!picked) return
    const invalid = await validatePromoImage(picked, kind)
    if (invalid) {
      setLocalError(invalid)
      setPreview(null)
      onFileChange(null)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setLocalError(null)
    setPreview(URL.createObjectURL(picked))
    onFileChange(picked)
  }

  const clearSelection = () => {
    setLocalError(null)
    setPreview(null)
    onFileChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // Local preview only counts while its file is still selected; otherwise the
  // stored image (edit mode) shows.
  const shownPreview = (file && preview) || existingUrl || null

  return (
    <Field
      label="Image"
      required
      error={localError ?? error ?? undefined}
      hint={`Exactly ${describePromoImageSpec(kind)} — other sizes are rejected.`}
    >
      <div className="flex flex-col gap-2">
        {shownPreview && (
          <div
            className="relative w-full overflow-hidden rounded-md border border-border bg-muted"
            style={{ aspectRatio: `${spec.width} / ${spec.height}` }}
          >
            <Image
              src={shownPreview}
              alt="Selected promotional image"
              fill
              sizes="(max-width: 640px) 100vw, 480px"
              className="object-cover"
              unoptimized
            />
            {file && (
              <button
                type="button"
                onClick={clearSelection}
                aria-label="Remove selected image"
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          <ImagePlus className="h-4 w-4" />
          {shownPreview ? 'Replace image' : 'Choose image'}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => void handlePick(e.target.files?.[0])}
        />
      </div>
    </Field>
  )
}
