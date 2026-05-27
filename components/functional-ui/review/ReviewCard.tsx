import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Star, ShieldCheck, ThumbsUp, ThumbsDown, Store } from 'lucide-react'
import type { ProductReview } from '@/types/review'
import { getPublicImageUrl } from '@/helper/getPublicImageUrl'

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

export const ReviewCard = ({ review }: { review: ProductReview }) => {
    const fullName =
        [review.profile?.first_name, review.profile?.last_name]
            .filter(Boolean)
            .join(' ') || 'Anonymous'

    const initials =
        [review.profile?.first_name?.[0], review.profile?.last_name?.[0]]
            .filter(Boolean)
            .join('')
            .toUpperCase() || 'A'

    const avatarUrl = review.profile?.profile_url?.[0] ?? null

    return (
        <div className="flex flex-col gap-4 py-6">
            {/* Reviewer Info */}
            <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9">
                    <AvatarImage src={avatarUrl ?? undefined} alt={fullName} />
                    <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold leading-tight">{fullName}</span>
                    <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </span>
                </div>
                <Badge
                    variant="secondary"
                    className="ml-auto flex items-center gap-1 text-xs text-success bg-success-tint border-success/30"
                >
                    <ShieldCheck className="w-3 h-3" />
                    Verified Purchase
                </Badge>
            </div>

            {/* Rating + Title */}
            <div className="flex flex-col gap-1">
                <StarRating rating={review.rating} />
                {review.title && (
                    <h4 className="text-sm font-semibold mt-1">{review.title}</h4>
                )}
            </div>

            {/* Body */}
            {review.body && (
                <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>
            )}

            {/* Review Images */}
            {review.review_images && review.review_images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {review.review_images
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((img) => (
                            <div
                                key={img.id}
                                className="relative w-20 h-20 rounded-md overflow-hidden border bg-muted"
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

            {/* Helpful Votes */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {review.helpful_count} helpful
                </span>
                <span className="flex items-center gap-1">
                    <ThumbsDown className="w-3.5 h-3.5" />
                    {review.not_helpful_count}
                </span>
            </div>

            {/* Seller Reply */}
            {review.seller_reply && (
                <div className="bg-muted/50 border rounded-md p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <Store className="w-3.5 h-3.5" />
                        Response from the seller
                        {review.seller_replied_at && (
                            <span className="font-normal text-muted-foreground ml-1">
                                ·{' '}
                                {new Date(review.seller_replied_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {review.seller_reply}
                    </p>
                </div>
            )}
        </div>
    )
}