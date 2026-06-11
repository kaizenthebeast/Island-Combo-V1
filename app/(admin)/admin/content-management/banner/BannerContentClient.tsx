'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ImageOff, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/shared/components/admin/PageHeader'
import StatusBadge, { BadgeVariant } from '@/shared/components/admin/StatusBadge'
import { PromoContentFormDialog } from '@/features/banners/components/admin/PromoContentFormDialog'
import { DeletePromoContentDialog } from '@/features/banners/components/admin/DeletePromoContentDialog'
import { PROMO_IMAGE_SPECS, describePromoImageSpec, type PromoImageKind } from '@/shared/config/promo-images'
import {
  getContentStatus,
  AD_PLACEMENT_LABELS,
  type ContentStatus,
  type BannerWithImage,
  type PromotionAdWithImage,
} from '@/shared/types/banner'

type PromoItem = BannerWithImage | PromotionAdWithImage

const STATUS_BADGE: Record<ContentStatus, { label: string; variant: BadgeVariant }> = {
  active:    { label: 'Active',    variant: 'success' },
  scheduled: { label: 'Scheduled', variant: 'info'    },
  expired:   { label: 'Expired',   variant: 'warning' },
  inactive:  { label: 'Inactive',  variant: 'default' },
}

const KIND_META = {
  banner: { endpoint: '/api/admin/banner',       kindLabel: 'banner'       as const },
  ad:     { endpoint: '/api/admin/promotion-ad', kindLabel: 'promotion ad' as const },
}

const formatDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    : ''

const formatSchedule = (item: PromoItem): string => {
  if (item.start_date && item.end_date) return `${formatDate(item.start_date)} – ${formatDate(item.end_date)}`
  if (item.start_date) return `From ${formatDate(item.start_date)}`
  if (item.end_date)   return `Until ${formatDate(item.end_date)}`
  return 'Always on'
}

// content card

function ContentCard({
  kind, item, onEdit, onDelete,
}: {
  kind: PromoImageKind
  item: PromoItem
  onEdit: () => void
  onDelete: () => void
}) {
  const spec = PROMO_IMAGE_SPECS[kind]
  const { label, variant } = STATUS_BADGE[getContentStatus(item)]

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-white">
      <div
        className="relative w-full bg-muted"
        style={{ aspectRatio: `${spec.width} / ${spec.height}` }}
      >
        {item.image_src ? (
          <Image
            src={item.image_src}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-6 w-6" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <StatusBadge status={label} variant={variant} />
        </div>
      </div>

      <div className="flex flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold text-foreground leading-snug">{item.title}</p>
          <span className="shrink-0 text-[11px] text-muted-foreground">#{item.display_order}</span>
        </div>

        <p className="text-[12px] text-muted-foreground">
          {formatSchedule(item)}
          {'placement' in item && ` · ${AD_PLACEMENT_LABELS[item.placement]}`}
        </p>

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-md border border-danger/30 px-2.5 py-1.5 text-[12px] font-medium text-danger hover:bg-danger-tint transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// section (one per content kind)

function ContentSection({
  kind, heading, blurb, items, onAdd, onEdit, onDelete,
}: {
  kind: PromoImageKind
  heading: string
  blurb: string
  items: PromoItem[]
  onAdd: () => void
  onEdit: (item: PromoItem) => void
  onDelete: (item: PromoItem) => void
}) {
  return (
    <div className="mb-10">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">{heading}</h2>
          <p className="text-[12px] text-muted-foreground">
            {blurb} · {describePromoImageSpec(kind)}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-[12px] font-medium text-white hover:bg-primary/90 transition-colors"
        >
          + Add
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white px-4 py-10 text-center text-[13px] text-muted-foreground">
          Nothing here yet — add your first one.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <ContentCard
              key={item.id}
              kind={kind}
              item={item}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// page client

type DialogTarget = { kind: PromoImageKind; item: PromoItem | null }

interface Props {
  banners: BannerWithImage[]
  ads: PromotionAdWithImage[]
}

export default function BannerContentClient({ banners, ads }: Props) {
  const router = useRouter()
  const [formTarget, setFormTarget]     = useState<DialogTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DialogTarget | null>(null)
  const [actionError, setActionError]   = useState<string | null>(null)

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget?.item) return
    const { endpoint } = KIND_META[deleteTarget.kind]

    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deleteTarget.item.id, imagePath: deleteTarget.item.image_url }),
    })
    const json = (await res.json()) as { success: boolean; message?: string }
    if (!res.ok || !json.success) {
      const message = json.message || 'Failed to delete — please try again.'
      setActionError(message)
      throw new Error(message)
    }

    setActionError(null)
    setDeleteTarget(null)
    router.refresh()
  }

  return (
    <section className="min-h-full bg-muted px-6 py-10">
      <PageHeader
        eyebrow="Content"
        title="Banner Management"
        subtitle="Hero banners and promotional ads shown across the storefront"
      />

      {actionError && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5">
          <p className="text-[12px] font-medium text-danger">{actionError}</p>
        </div>
      )}

      <ContentSection
        kind="banner"
        heading="Hero Banners"
        blurb="Full-width rotating slides at the top of the homepage"
        items={banners}
        onAdd={() => setFormTarget({ kind: 'banner', item: null })}
        onEdit={(item) => setFormTarget({ kind: 'banner', item })}
        onDelete={(item) => setDeleteTarget({ kind: 'banner', item })}
      />

      <ContentSection
        kind="ad"
        heading="Promotion Ads"
        blurb="Promotional strips targeted to specific pages"
        items={ads}
        onAdd={() => setFormTarget({ kind: 'ad', item: null })}
        onEdit={(item) => setFormTarget({ kind: 'ad', item })}
        onDelete={(item) => setDeleteTarget({ kind: 'ad', item })}
      />

      {formTarget && (
        <PromoContentFormDialog
          kind={formTarget.kind}
          open
          item={formTarget.item}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null)
            router.refresh()
          }}
        />
      )}

      <DeletePromoContentDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        itemTitle={deleteTarget?.item?.title ?? ''}
        kindLabel={deleteTarget ? KIND_META[deleteTarget.kind].kindLabel : 'banner'}
        onConfirm={handleDeleteConfirm}
      />
    </section>
  )
}
