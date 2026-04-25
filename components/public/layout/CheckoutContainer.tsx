'use client'

import { useEffect } from "react"
import BillingSummary from "@/components/functional-ui/checkout/BillingSummary"
import OrderSummary from "@/components/functional-ui/checkout/OrderSummary"
import { useCartStore } from "@/store/cartStore"
import { ShoppingCart } from "lucide-react"
import Link from "next/link"

const CheckoutContainer = () => {
  const { cart, fetchCart, totalQty, subtotal } = useCartStore()

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  if (cart.length === 0) {
    return (
      <section className="max-w-7xl mx-auto p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center text-center gap-4">

          <div className="p-4 rounded-full bg-[#900036]">
            <ShoppingCart className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
            Your Cart is empty.
          </h2>

          <p className="text-sm md:text-base text-gray-500">
            Start shopping and find your next favourites
          </p>

          <Link href='/' className="mt-2 px-6 py-2 rounded-full border border-[#900036] text-red-500 hover:bg-[#900036] hover:text-white transition">
            Let’s Go Shopping!
          </Link>

        </div>
      </section>
    )
  }


  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-2/3">
        <OrderSummary cartItems={cart} />
      </div>

      <div className="w-full md:w-1/3">
        <BillingSummary totalQty={totalQty} subtotal={subtotal} />
      </div>
    </div>
  )
}


export default CheckoutContainer
