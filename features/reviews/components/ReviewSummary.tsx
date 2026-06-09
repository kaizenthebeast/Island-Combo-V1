import { StarRating } from './ReviewCard'
import type { ReviewStats } from '@/shared/types/review'

export type ReviewFilter = 'all' | 'media'

type Props = {
    stats: ReviewStats
    filter: ReviewFilter
    onFilterChange: (filter: ReviewFilter) => void
}

export const ReviewSummary = ({ stats, filter, onFilterChange }: Props) => {
    const { avgRating } = stats
    const displayAvg = Number.isInteger(avgRating) ? `${avgRating}` : avgRating.toFixed(1)

    return (
        <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{displayAvg}/5</span>
                <StarRating rating={Math.round(avgRating)} />
            </div>

            <div className="flex items-center gap-2">
                {([
                    { key: 'all', label: 'All' },
                    { key: 'media', label: 'With media' },
                ] as const).map(({ key, label }) => {
                    const active = filter === key
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onFilterChange(key)}
                            aria-pressed={active}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                                active
                                    ? 'bg-brand-tint text-brand border-brand/30'
                                    : 'border-border text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            {label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
