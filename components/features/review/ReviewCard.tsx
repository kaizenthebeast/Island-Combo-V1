import Image from 'next/image'
import { Star, Store } from 'lucide-react'
import type { ProductReview } from '@/types/review'
import { getPublicImageUrl } from '@/lib/utils/image-url'

export const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
            <Star
                key={i}
                className={`w-4 h-4 ${
                    i < rating
                        ? 'fill-warning text-warning'
                        : 'fill-muted text-muted-foreground'
                }`}
            />
        ))}
    </div>
)

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    })

export const ReviewCard = ({ review }: { review: ProductReview }) => {
    const fullName =
        [review.profile?.first_name, review.profile?.last_name]
            .filter(Boolean)
            .join(' ') || 'Anonymous'

    return (
        <div className="flex flex-col gap-2 py-5">
            {/* Name + date */}
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold leading-tight">{fullName}</span>
                <span className="text-xs text-muted-foreground">
                    {formatDate(review.created_at)}
                </span>
            </div>

            <StarRating rating={review.rating} />

            {review.body && (
                <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>
            )}

            {review.review_images && review.review_images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                    {review.review_images
                        .slice()
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((img) => (
                            <div
                                key={img.id}
                                className="relative w-16 h-16 rounded-md overflow-hidden border bg-muted"
                            >
                                <Image
                                    src={getPublicImageUrl(img.image_path)}
                                    alt="Review image"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ))}
                </div>
            )}

            {review.seller_reply && (
                <div className="bg-muted/50 border rounded-md p-4 flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <Store className="w-3.5 h-3.5" />
                        Response from the seller
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {review.seller_reply}
                    </p>
                </div>
            )}
        </div>
    )
}
