import { Skeleton } from '@/shared/components/ui/skeleton'
import { CategoryPillsSkeleton, ProductGridSkeleton } from '@/shared/components/common/skeletons'

// Streams in while the category + its product list load.
export default function Loading() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6">
      <Skeleton className="h-8 w-48" />
      <CategoryPillsSkeleton count={5} />
      <ProductGridSkeleton count={12} />
    </section>
  )
}
