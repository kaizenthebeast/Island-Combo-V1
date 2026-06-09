'use client'

import { useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReviewCard } from './ReviewCard'
import { ReviewSummary, type ReviewFilter } from './ReviewSummary'
import { getProductReviews } from '@/features/reviews/api/review'
import type { ProductReview, ReviewStats } from '@/shared/types/review'

type Props = {
    slug: string
    initialReviews: ProductReview[]
    total: number
    totalPages: number
    pageSize: number
    stats: ReviewStats
}

export default function ReviewPagination({
    slug,
    initialReviews,
    total,
    totalPages,
    pageSize,
    stats,
}: Props) {
    const [reviews, setReviews] = useState(initialReviews)
    const [currentPage, setCurrentPage] = useState(1)
    const [filter, setFilter] = useState<ReviewFilter>('all')
    const [isPending, startTransition] = useTransition()

    // "With media" filters the currently-loaded page to reviews that have images.
    const visibleReviews =
        filter === 'media'
            ? reviews.filter((r) => r.review_images && r.review_images.length > 0)
            : reviews

    const safeTotalPages = Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1

    const goToPage = (page: number) => {
        if (page < 1 || page > safeTotalPages || page === currentPage) return

        startTransition(async () => {
            const data = await getProductReviews(slug, page, pageSize)

            // Don't advance if the server returned nothing
            if (!data.reviews.length) return

            setReviews(data.reviews)
            setCurrentPage(page)

            document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })
        })
    }

    // Build visible page numbers: always show first, last, current ± 1, with ellipsis
    const getPageNumbers = () => {
        if (safeTotalPages <= 5) return Array.from({ length: safeTotalPages }, (_, i) => i + 1)

        const pages: (number | '...')[] = []
        const addPage = (p: number) => {
            if (!pages.includes(p)) pages.push(p)
        }

        addPage(1)
        if (currentPage > 3) pages.push('...')
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(safeTotalPages - 1, currentPage + 1); i++) {
            addPage(i)
        }
        if (currentPage < safeTotalPages - 2) pages.push('...')
        addPage(safeTotalPages)

        return pages
    }

    return (
        <div id="reviews" className="flex flex-col gap-5">
            <h2 className="title-header text-lg sm:text-xl md:text-2xl">
                Reviews ({total})
            </h2>

            <ReviewSummary stats={stats} filter={filter} onFilterChange={setFilter} />

            {/* Review List */}
            <div
                className={`flex flex-col divide-y transition-opacity duration-200 ${
                    isPending ? 'opacity-40 pointer-events-none' : 'opacity-100'
                }`}
            >
                {visibleReviews.length > 0 ? (
                    visibleReviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                    ))
                ) : (
                    <p className="py-6 text-sm text-muted-foreground">
                        No reviews with photos on this page.
                    </p>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col items-center gap-3 pt-2">
              
                    <div className="flex items-center gap-1">
                        {/* Prev */}
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1 || isPending}
                            className="flex items-center justify-center w-8 h-8 rounded-md border
                                       text-muted-foreground hover:bg-muted hover:text-foreground
                                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Page numbers */}
                        {getPageNumbers().map((p, i) =>
                            p === '...' ? (
                                <span
                                    key={`ellipsis-${i}`}
                                    className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground"
                                >
                                    …
                                </span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => goToPage(p as number)}
                                    disabled={isPending}
                                    className={`w-8 h-8 rounded-md text-xs font-medium transition-colors
                                        ${
                                            currentPage === p
                                                ? 'bg-brand-tint text-brand border border-brand/30'
                                                : 'border hover:bg-muted text-muted-foreground hover:text-foreground'
                                        }
                                        disabled:cursor-not-allowed`}
                                >
                                    {p}
                                </button>
                            )
                        )}

                        {/* Next */}
                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages || isPending}
                            className="flex items-center justify-center w-8 h-8 rounded-md border
                                       text-muted-foreground hover:bg-muted hover:text-foreground
                                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            aria-label="Next page"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}