import React from 'react'
import ProductsClient from './ProductsClient'
import { getAdminProducts } from '@/lib/product'
import type { AdminProduct } from '@/types/product'

const AdminProductPage = async () => {
  const result = await getAdminProducts()

  if (!result.success || !('data' in result)) {
    return (
      <div className="p-8 text-red-500">
        Failed to load products: {result.message}
      </div>
    )
  }

  return <ProductsClient products={result.data as AdminProduct[]} />
}

export default AdminProductPage