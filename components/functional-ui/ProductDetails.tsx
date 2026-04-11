import { getProductBySlug } from '@/lib/product'

type Props = {
    slug: string
}

const ProductDetails = async ({ slug }: Props) => {
    const product = await getProductBySlug(slug)

    if (!product) return <div>Product not found</div>

    return (
        <div className="p-10">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="text-lg mt-2">${product.price}</p>
            <p className="mt-4 text-gray-600">{product.description}</p>
        </div>
    )
}

export default ProductDetails
