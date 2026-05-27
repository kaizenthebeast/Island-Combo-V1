import Link from 'next/link'
import Image from 'next/image'

const CashVoucherBanner = () => {
  return (
    <section className="w-full">
      <div className="flex flex-col sm:flex-row rounded-lg overflow-hidden border border-border shadow-sm">
        <div className="relative w-full h-40 sm:h-auto sm:w-[35%] md:w-[30%] shrink-0">
          <Image
            src="/images/voucherImage.png"
            alt="Buy Cash Voucher"
            fill
            sizes="(max-width: 640px) 100vw, 35vw"
            className="object-cover"
            priority
          />
        </div>

        <div className="flex-1 bg-white p-5 sm:p-6 md:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1 sm:gap-2">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
              Buy Cash Voucher
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
              Purchase a voucher and reload your account whenever it&apos;s
              convenient — redeemable at checkout on your next order.
            </p>
          </div>

          <Link
            href="#"
            className="inline-flex items-center justify-center bg-brand hover:bg-brand-hover text-brand-foreground text-sm font-semibold px-5 py-2.5 rounded-md transition-colors shrink-0"
          >
            Buy Cash Voucher
          </Link>
        </div>
      </div>
    </section>
  )
}

export default CashVoucherBanner
