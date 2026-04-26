import React from 'react'
import ProductsClient from './ProductsClient'
import { getAdminProducts } from '@/lib/product'


const AdminProductPage = async () => {
  const products = await getAdminProducts();

  return <ProductsClient products={products} />
}

export default AdminProductPage