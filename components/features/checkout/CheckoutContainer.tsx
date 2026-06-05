'use client'

import { useEffect } from "react"
import BillingSummary from "@/components/features/checkout/BillingSummary"
import OrderSummary from "@/components/features/checkout/OrderSummary"
import MobileCart from "@/components/features/cart/MobileCart"
import { useCartStore } from "@/lib/store/cart-store"
import Image from "next/image"
import Link from "next/link"

const CheckoutContainer = () => {
  const { cart, fetchCart, selectedQty, selectedSubtotal } = useCartStore()

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  if (cart.length === 0) {
    return (
      <section className="w-full min-h-svh flex items-center justify-center">
        <div className="flex flex-col items-center text-center gap-4 max-w-xs w-full">
          <Image
            src="/images/cartIcon.png"
            width={48}
            height={48}
            className="object-contain"
            alt="cart-icon"
          />


          <h2 className="text-xl md:text-2xl font-semibold text-foreground">
            Your Cart is empty.
          </h2>

          <p className="text-sm md:text-base text-muted-foreground">
            Start shopping and find your next favourites
          </p>

          <Link
            href="/"
            className="w-full mt-2 px-6 py-2 rounded-full border border-brand text-brand hover:bg-brand hover:text-white transition text-center text-sm md:text-base"
          >
            Let&apos;s Go Shopping!
          </Link>

        </div>
      </section>
    )
  }


  return (
    <>
      {/* Desktop — unchanged two-column layout */}
      <div className="hidden md:flex max-w-7xl mx-auto p-6 gap-6 mt-8">
        <div className="w-2/3">
          <OrderSummary cartItems={cart} />
        </div>
        <div className="w-1/3">
          <BillingSummary totalQty={selectedQty} subtotal={selectedSubtotal} />
        </div>
      </div>

      {/* Mobile — checkbox list + fixed checkout bar */}
      <div className="md:hidden">
        <MobileCart />
      </div>
    </>
  )
}


export default CheckoutContainer
