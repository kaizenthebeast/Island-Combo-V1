import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

// Shown after a product order is placed (COD or card). Kept intentionally simple
// — the order is created server-side; this just confirms it. The cash-voucher
// flow has its own richer success UI (CashVoucherSuccess).
const CheckoutSuccessPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) => {
  const { order } = await searchParams

  return (
    <section className="section-container">
      <div className="max-w-md mx-auto flex flex-col items-center text-center gap-4 py-16">
        <CheckCircle2 className="w-16 h-16 text-success" />
        <h1 className="text-2xl font-bold">Order placed</h1>
        <p className="text-sm text-muted-foreground">
          Thank you! Your order has been received and is now being prepared.
          {order ? (
            <>
              {' '}Your order number is{' '}
              <span className="font-semibold text-foreground">#{order}</span>.
            </>
          ) : null}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full">
          <Link
            href="/"
            className="flex-1 bg-brand text-white py-3 rounded-full font-medium hover:opacity-90 transition text-center"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  )
}

export default CheckoutSuccessPage
