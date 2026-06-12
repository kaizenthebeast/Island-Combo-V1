import { PageHeaderSkeleton, TableSkeleton } from '@/shared/components/common/skeletons'

// Generic back-office loader: header + data table. Covers every /admin section
// (orders, products, users, refunds, audit, …); the dashboard overrides it
// with its own shaped loading.tsx.
export default function Loading() {
  return (
    <section className="min-h-full bg-muted px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <PageHeaderSkeleton />
      <TableSkeleton rows={8} />
    </section>
  )
}
