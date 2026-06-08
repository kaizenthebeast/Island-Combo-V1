import ProductDetailsContainer from '@/components/features/product/ProductDetailsContainer'

type Props = {
    params: Promise<{ slug: string }>
}

const ProductDetailsPage = async ({ params }: Props) => {
    const { slug } = await params
    return (
        <ProductDetailsContainer slug={slug} />
    )
}

export default ProductDetailsPage
