import { Star } from 'lucide-react'
import { getProductReviews, getReviewStats } from '@/lib/reviews/review'
import { REVIEW_CONFIG } from '@/lib/types/review'
import ReviewPagination from './ReviewPagination'

const ProductReview = async ({ slug }: { slug: string }) => {
    const [{ reviews, total, totalPages }, stats] = await Promise.all([
        getProductReviews(slug, 1, REVIEW_CONFIG.PAGE_SIZE),
        getReviewStats(slug),
    ])

    if (total === 0) {
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

    return (
        <ReviewPagination
            slug={slug}
            initialReviews={reviews}
            total={total}
            totalPages={totalPages}
            pageSize={REVIEW_CONFIG.PAGE_SIZE}
            stats={stats}
        />
    )
}

export default ProductReview