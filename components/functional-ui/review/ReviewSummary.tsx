import { Star } from 'lucide-react'
import { StarRating } from './ReviewCard'
import type { ReviewStats } from '@/types/review'

type Props = {
    stats: ReviewStats
}

export const ReviewSummary = ({ stats }: Props) => {
    const { avgRating, ratingCounts, total } = stats

    return (
        <div className="flex items-start gap-8 p-6 rounded-lg border bg-muted/30">
            <div className="flex flex-col items-center gap-1">
                <span className="text-4xl font-bold">{avgRating.toFixed(1)}</span>
                <StarRating rating={Math.round(avgRating)} />
                <span className="text-xs text-muted-foreground mt-1">
                    {total} {total === 1 ? 'review' : 'reviews'}
                </span>
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
                {ratingCounts.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-right text-muted-foreground">{star}</span>
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                                style={{
                                    width: total > 0 ? `${(count / total) * 100}%` : '0%',
                                }}
                            />
                        </div>
                        <span className="w-4 text-muted-foreground">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}