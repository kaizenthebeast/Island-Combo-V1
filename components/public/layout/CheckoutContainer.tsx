'use client'

import { useEffect } from "react"
import BillingSummary from "@/components/functional-ui/BillingSummary"
import OrderSummary from "@/components/functional-ui/OrderSummary"
import { useCartStore } from "@/store/cartStore"

const CheckoutContainer = () => {
  const { cart, fetchCart} = useCartStore()

  useEffect(() => {
    fetchCart()
  }, [fetchCart])


  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">
      
      <div className="w-full md:w-2/3">
        <OrderSummary cartItems={cart} />
      </div>

      <div className="w-full md:w-1/3">
        <BillingSummary />
      </div>

    </div>
  )
}

export default CheckoutContainer