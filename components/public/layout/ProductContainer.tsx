import React from 'react'
import { getAllProducts } from '@/lib/product'
import ProductCard from '../../card/ProductCard';
import EnsureAnonSession from '../../functional-ui/EnsureAnonSession';


const ProductContainer = async () => {
    const products = await getAllProducts();

    return (
        <div>
            <EnsureAnonSession />

            {products.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}

        </div>
    )
}

export default ProductContainer 