import { Skeleton } from '@/shared/components/ui/skeleton'

// Mirrors the dashboard layout: welcome banner, 8 KPI cards, revenue chart,
// two half-width cards, low-stock table.
export default function Loading() {
  return (
    <section className="min-h-full bg-muted px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      {/* Welcome banner */}
      <Skeleton className="h-40 w-full rounded-3xl sm:h-44" />

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-white p-4 shadow-xs">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="mt-3 h-7 w-24" />
            <Skeleton className="mt-2 h-3 w-20" />
            <Skeleton className="mt-1.5 h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="mt-6 rounded-2xl border border-border bg-white p-4 shadow-xs sm:p-5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-4 h-[240px] w-full rounded-md" />
      </div>

      {/* Donut + top products */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-white p-4 shadow-xs sm:p-5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-4 h-[240px] w-full rounded-md" />
          </div>
        ))}
      </div>

      {/* Low stock */}
      <div className="mt-6 rounded-2xl border border-border bg-white p-4 shadow-xs sm:p-5">
        <Skeleton className="h-4 w-28" />
        <div className="mt-4 space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      </div>
    </section>
  )
}
