import React from 'react'
import Image from 'next/image'
import { getProductReviews } from '@/lib/review'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Star, ShieldCheck, ThumbsUp, ThumbsDown, Store } from 'lucide-react'
import type { ProductReview } from '@/types/review'
import { getPublicImageUrl } from '@/helper/getPublicImageUrl'
const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
            <Star
                key={i}
                className={`w-4 h-4 ${i < rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-muted text-muted-foreground'
                    }`}
            />
        ))}
    </div>
)

const ReviewCard = ({ review }: { review: ProductReview }) => {
    const fullName = [review.profile?.first_name, review.profile?.last_name]
        .filter(Boolean)
        .join(' ') || 'Anonymous'

    const initials = [review.profile?.first_name?.[0], review.profile?.last_name?.[0]]
        .filter(Boolean)
        .join('')
        .toUpperCase() || 'A'

    const avatarUrl = Array.isArray(review.profile?.profile_url)
        ? review.profile.profile_url[0]
        : null

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

                {/* Verified Purchase Badge */}
                <Badge
                    variant="secondary"
                    className="ml-auto flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border-emerald-200"
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
                                · {new Date(review.seller_replied_at).toLocaleDateString('en-US', {
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

const ProductReview = async ({ slug }: { slug: string }) => {
    const reviews = await getProductReviews(slug)

    if (reviews.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                <Star className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm font-medium">No reviews yet</p>
                <p className="text-xs text-muted-foreground">
                    Be the first to review this product after your purchase.
                </p>
            </div>
        )
    }

    // Summary stats
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => r.rating === star).length,
    }))

    return (
        <div className="flex flex-col gap-6">

            {/* Summary Header */}
            <div className="flex items-start gap-8 p-6 rounded-lg border bg-muted/30">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-4xl font-bold">{avgRating.toFixed(1)}</span>
                    <StarRating rating={Math.round(avgRating)} />
                    <span className="text-xs text-muted-foreground mt-1">
                        {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                    </span>
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                    {ratingCounts.map(({ star, count }) => (
                        <div key={star} className="flex items-center gap-2 text-xs">
                            <span className="w-3 text-right text-muted-foreground">{star}</span>
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-yellow-400 rounded-full"
                                    style={{
                                        width: reviews.length
                                            ? `${(count / reviews.length) * 100}%`
                                            : '0%',
                                    }}
                                />
                            </div>
                            <span className="w-4 text-muted-foreground">{count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Review List */}
            <div className="flex flex-col divide-y">
                {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                ))}
            </div>
        </div>
    )
}

export default ProductReview