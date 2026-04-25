import React from 'react'
import { getAllProducts } from '@/lib/product'
import ProductCard from '@/components/card/ProductCard';



const ProductContainer = async () => {
    const products = await getAllProducts();

    return (
        <>
            <h2 className="title-header text-lg sm:text-xl md:text-2xl">
                Daily Discover
            </h2>
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 w-full place-items-center'>

            {products.map((product) => (
                <ProductCard key={product.product_id} product={product} />
            ))}
            </div>
        </>
    )
}

export default ProductContainer 