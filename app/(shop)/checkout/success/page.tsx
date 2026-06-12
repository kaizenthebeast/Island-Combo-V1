import Link from 'next/link'
import { Check } from 'lucide-react'
import { getMyOrderDetail } from '@/features/orders/api/orders'
import ProductContainer from '@/features/products/components/ProductContainer'

// Shown after a product order is placed. Card/online orders are already paid
// ("You paid $X"); cash-on-delivery orders are placed but unpaid, so the wording
// changes to "Pay $X on delivery". Below the confirmation we surface Daily
// Discover so the shopper can keep browsing.
const formatUsd = (n: number) =>
  `$${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Decorative confetti scattered around the success check (matches the Figma).
const CONFETTI: { top: number; left: number; w: number; h: number; color: string; round: string; r: number }[] = [
  { top: 6,  left: 34,  w: 6, h: 6,  color: '#e11d48', round: '9999px', r: 0 },
  { top: 2,  left: 64,  w: 5, h: 11, color: '#10b981', round: '2px',    r: -40 },
  { top: 4,  left: 132, w: 6, h: 6,  color: '#6366f1', round: '9999px', r: 0 },
  { top: 0,  left: 96,  w: 5, h: 11, color: '#f59e0b', round: '2px',    r: 35 },
  { top: 12, left: 156, w: 6, h: 6,  color: '#10b981', round: '9999px', r: 0 },
  { top: 26, left: 14,  w: 5, h: 10, color: '#6366f1', round: '2px',    r: -25 },
  { top: 30, left: 198, w: 5, h: 11, color: '#ec4899', round: '2px',    r: 20 },
  { top: 56, left: 8,   w: 6, h: 6,  color: '#f59e0b', round: '9999px', r: 0 },
  { top: 60, left: 208, w: 6, h: 6,  color: '#900036', round: '9999px', r: 0 },
  { top: 44, left: 220, w: 5, h: 9,  color: '#e11d48', round: '2px',    r: 15 },
]

const CheckoutSuccessPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) => {
  const { order } = await searchParams // the public UUID ref
  const detail = order ? await getMyOrderDetail(order) : null

  const isCod = detail?.order.payment_method === 'cod'
  // Pickup orders have their shipping_address set to "Store Pickup — …" by create_order.
  const isPickup = detail?.order.shipping_address?.startsWith('Store Pickup') ?? false
  const amount = detail?.order.total_amount ?? null

  const title =
    amount == null
      ? isCod
        ? 'Order placed'
        : 'Payment successful'
      : isCod
        ? `Pay ${formatUsd(amount)} ${isPickup ? 'at pickup' : 'on delivery'}`
        : `You paid ${formatUsd(amount)}`

  const thanks = isCod ? 'Thank you for your order!' : 'Thank you for your purchase!'
  const subtitle = isPickup
    ? `${thanks} We'll email you when your order is ready for pickup.`
    : `${thanks} We'll send a shipping confirmation to your email.`

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-8 p-4 md:p-6">
      {/* Confirmation card */}
      <div className="w-full rounded-2xl bg-muted px-6 py-14 sm:py-20">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          {/* Check + confetti */}
          <div className="relative mx-auto h-28 w-56">
            {CONFETTI.map((c, i) => (
              <span
                key={i}
                className="absolute block"
                style={{
                  top: c.top,
                  left: c.left,
                  width: c.w,
                  height: c.h,
                  background: c.color,
                  borderRadius: c.round,
                  transform: `rotate(${c.r}deg)`,
                }}
              />
            ))}
            <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand shadow-md">
              <Check className="h-10 w-10 text-white" strokeWidth={3} />
            </div>
          </div>

          <h1 className="mt-2 text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{subtitle}</p>

          <Link
            href={order ? '/account?tab=orders' : '/'}
            className="mt-6 inline-block rounded-full border border-brand px-10 py-2.5 text-sm font-medium text-brand transition-colors hover:bg-brand hover:text-white"
          >
            {order ? 'View Orders' : 'Continue shopping'}
          </Link>
        </div>
      </div>

      {/* Daily Discover */}
      <ProductContainer />
    </section>
  )
}

export default CheckoutSuccessPage
