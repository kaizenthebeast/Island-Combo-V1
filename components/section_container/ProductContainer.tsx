import React from 'react'
import { getAllProducts } from '@/lib/product'
import ProductCard from '../card/ProductCard';


const ProductContainer = async () => {
    const products = await getAllProducts();
    return (
        <div>

            {products.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}

        </div>
    )
}

export default ProductContainer 