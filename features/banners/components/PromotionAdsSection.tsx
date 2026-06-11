import Image from 'next/image'
import Link from 'next/link'
import { PROMO_IMAGE_SPECS } from '@/shared/config/promo-images'
import type { PromotionAdWithImage } from '@/shared/types/banner'

/** Storefront strip of admin-managed promotion ads for one placement.
 *  Pass the result of `getPromotionAds(placement, true)` — already filtered to
 *  live ads, with `image_src` signed against the private bucket. Renders
 *  nothing when there is nothing to show. */
export function PromotionAdsSection({ ads }: { ads: PromotionAdWithImage[] }) {
  const visible = ads.filter((ad) => ad.image_src)
  if (visible.length === 0) return null

  const spec = PROMO_IMAGE_SPECS.ad

  return (
    <div className={`grid grid-cols-1 gap-4 ${visible.length > 1 ? 'sm:grid-cols-2' : ''}`}>
      {visible.map((ad) => {
        const image = (
          <Image
            src={ad.image_src!}
            alt={ad.title}
            width={spec.width}
            height={spec.height}
            sizes="(max-width: 640px) 100vw, 640px"
            className="h-auto w-full rounded-lg object-cover"
            unoptimized
          />
        )

        return ad.cta_url ? (
          <Link
            key={ad.id}
            href={ad.cta_url}
            aria-label={ad.title}
            className="block transition-opacity hover:opacity-90"
          >
            {image}
          </Link>
        ) : (
          <div key={ad.id}>{image}</div>
        )
      })}
    </div>
  )
}
