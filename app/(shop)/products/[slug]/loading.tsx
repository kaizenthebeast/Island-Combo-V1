import { ProductDetailsSkeleton } from '@/shared/components/common/skeletons'

// Streams in while the product detail (catalog read) renders.
export default function Loading() {
  return (
    <section className="mx-auto mt-5 flex max-w-7xl flex-col p-5">
      <ProductDetailsSkeleton />
    </section>
  )
}
