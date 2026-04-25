import { getProductBySlug } from '@/lib/product'
import { Suspense } from 'react'
import ProductDetails from '@/components/functional-ui/product/ProductDetails'
import { notFound } from 'next/navigation'
type Props = {
    slug: string
}

const ProductDetailsContainer = async ({ slug }: Props) => {
    const product = await getProductBySlug(slug)

    if (!product){
        notFound()
    }

    return (
        <section className="min-h-svh max-w-7xl mx-auto flex items-center justify-center p-5">
            <div className="flex flex-col md:flex-row gap-10 w-full">
                <Suspense fallback={<div>Loading...</div>}>
                  <ProductDetails product={product}/>
                </Suspense>
            </div>
        </section>
    )
}
export default ProductDetailsContainer
