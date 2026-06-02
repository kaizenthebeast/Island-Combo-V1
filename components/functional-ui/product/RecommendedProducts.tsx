import { getRecommendedProducts } from '@/lib/products/product'
import ProductCard from '@/components/card/ProductCard'

type Props = {
  productId: number
  categoryId: number | null
}

const RecommendedProducts = async ({ productId, categoryId }: Props) => {
  const products = await getRecommendedProducts(productId, categoryId, 12)
  if (products.length === 0) return null

  return (
    <section className="w-full mt-8">
      <h2 className="title-header text-lg sm:text-xl md:text-2xl mb-3 sm:mb-4">
        Recommended for you
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 w-full place-items-center">
        {products.map((product) => (
          <ProductCard key={product.product_id} product={product} />
        ))}
      </div>
    </section>
  )
}

export default RecommendedProducts
