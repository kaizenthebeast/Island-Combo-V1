import { getProductBySlug } from '@/lib/products/product'
import { Suspense } from 'react'
import ProductDetails from '@/components/functional-ui/product/ProductDetails'
import ProductReview from '@/components/functional-ui/review/ProductReview'
import RecommendedProducts from '@/components/functional-ui/product/RecommendedProducts'
import { notFound } from 'next/navigation'

type Props = {
    slug: string
}

// Skeleton shown while the first page of reviews loads
const ReviewSkeleton = () => (
    <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-24 rounded-lg bg-muted" />
        {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 py-6 border-b">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted" />
                    <div className="flex flex-col gap-1.5">
                        <div className="h-3 w-24 rounded bg-muted" />
                        <div className="h-2.5 w-16 rounded bg-muted" />
                    </div>
                </div>
                <div className="h-3 w-28 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-3/4 rounded bg-muted" />
            </div>
        ))}
    </div>
)

const ProductDetailsContainer = async ({ slug }: Props) => {
    const product = await getProductBySlug(slug)

    if (!product) {
        notFound()
    }

    return (
        <section className="min-h-svh max-w-7xl mx-auto flex flex-col p-5 mt-5">
            <div className="flex flex-col md:flex-row gap-10 w-full">
                <Suspense fallback={<div>Loading...</div>}>
                    <ProductDetails product={product} />
                </Suspense>
            </div>

            {/* Reviews stream in independently — doesn't block the product render */}
            <Suspense fallback={<ReviewSkeleton />}>
                <ProductReview slug={slug} />
            </Suspense>

            <Suspense fallback={null}>
                <RecommendedProducts
                    productId={product.product_id}
                    categoryId={product.category?.category_id ?? null}
                />
            </Suspense>
        </section>
    )
}

export default ProductDetailsContainer