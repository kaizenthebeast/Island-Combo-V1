import ProductDetails from '@/components/functional-ui/ProductDetails'

type Props = {
    params: Promise<{ slug: string }>
}

const ProductDetailsPage = async ({ params }: Props) => {
    const { slug } = await params

    return (
        <ProductDetails slug={slug} />
    )
}

export default ProductDetailsPage
