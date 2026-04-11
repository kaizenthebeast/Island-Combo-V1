import React from 'react'
import { getAllProducts } from '@/lib/product'
import ProductCard from '@/components/card/ProductCard';



const ProductContainer = async () => {
    const products = await getAllProducts();

    return (
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4'>
            {products.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
     
        </div>
    )
}

export default ProductContainer 