import { Skeleton } from '@/shared/components/ui/skeleton'
import { CategoryPillsSkeleton, ProductGridSkeleton } from '@/shared/components/common/skeletons'

// Streams in while the home page (banners + catalog reads) renders. Also the
// fallback for (shop) child routes that don't define their own loading.tsx.
export default function Loading() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6">
      {/* Hero banner */}
      <Skeleton className="h-40 w-full rounded-2xl sm:h-56 md:h-72" />

      {/* Category pills */}
      <CategoryPillsSkeleton count={8} />

      {/* Promo strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* Daily Discover */}
      <Skeleton className="h-6 w-44" />
      <ProductGridSkeleton count={12} />
    </section>
  )
}
