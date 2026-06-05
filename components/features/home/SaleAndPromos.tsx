import { getSaleProducts } from '@/lib/products/product'
import ProductCard from '@/components/features/product/ProductCard'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel'

const SaleAndPromos = async () => {
  const products = await getSaleProducts(12)
  if (products.length === 0) return null

  return (
    <section className="w-full">
      <h2 className="title-header text-lg sm:text-xl md:text-2xl mb-3 sm:mb-4">
        Sale and Promos
      </h2>

      <Carousel opts={{ align: 'start', dragFree: true }} className="w-full">
        <CarouselContent className="-ml-2 sm:-ml-3">
          {products.map((product) => (
            <CarouselItem
              key={product.product_id}
              className="pl-2 sm:pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
            >
              <ProductCard product={product} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  )
}

export default SaleAndPromos
