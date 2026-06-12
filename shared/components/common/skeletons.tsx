import { Skeleton } from '@/shared/components/ui/skeleton'

/**
 * Shared skeleton blocks (shadcn/ui Skeleton) used by route-level loading.tsx
 * files and client components while data streams in. Shapes mirror the real
 * components so the page doesn't jump when content arrives.
 */

// Mirrors ProductCard: square image, two title lines, price row.
export function ProductCardSkeleton() {
  return (
    <div className="flex w-full flex-col">
      <Skeleton className="w-full rounded-md pb-[100%]" />
      <Skeleton className="mt-2 h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/3" />
    </div>
  )
}

// Mirrors the catalog grid (home / category / search): 2→6 columns.
export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Mirrors the ProductDetails two-column layout: gallery left, info right.
export function ProductDetailsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-10 md:flex-row">
      {/* Gallery */}
      <div className="w-full md:w-1/2">
        <Skeleton className="w-full rounded-xl pb-[100%]" />
        <div className="mt-3 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-16 rounded-md" />
          ))}
        </div>
      </div>
      {/* Info */}
      <div className="flex w-full flex-col md:w-1/2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="mt-2 h-6 w-1/2" />
        <Skeleton className="mt-4 h-4 w-32" />
        <Skeleton className="mt-5 h-8 w-28" />
        <div className="mt-6 flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full" />
          ))}
        </div>
        <Skeleton className="mt-6 h-10 w-36 rounded-md" />
        <div className="mt-8 flex gap-3">
          <Skeleton className="h-11 flex-1 rounded-full" />
          <Skeleton className="h-11 flex-1 rounded-full" />
        </div>
      </div>
    </div>
  )
}

// Round category pills with labels (home / category pages).
export function CategoryPillsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      ))}
    </div>
  )
}

// Admin: PageHeader (eyebrow, title, subtitle) stand-in.
export function PageHeaderSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-8 w-56" />
      <Skeleton className="mt-2 h-3.5 w-72" />
    </div>
  )
}

// Admin: toolbar + table card stand-in (matches DataTable proportions).
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-xs sm:p-5">
      {/* Toolbar: search + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-full max-w-xs rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
      {/* Header row */}
      <Skeleton className="mt-4 h-9 w-full rounded-md" />
      {/* Rows */}
      <div className="mt-2 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-3.5 w-36" />
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  )
}
