import OrderSummary from "@/components/public/layout/OrderSummary"

const CheckoutContainer = () => {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-5 flex flex-col md:flex-row gap-6">

      {/* LEFT: Cart / Order Items */}
      <div className="w-full md:w-2/3">
        <OrderSummary />
      </div>

      {/* RIGHT: Checkout Summary Card */}
      <div className="w-full md:w-1/3">

        <div className="bg-white rounded-lg shadow-sm border p-5 space-y-6">

          {/* Promo Code */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold">
              Apply Promo Code
            </h3>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Promo code"
                className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#900036]"
              />
              <button
                type="button"
                className="text-[#900036] font-medium text-sm hover:underline"
              >
                Apply
              </button>
            </div>
          </div>

          <hr />

          {/* Order Summary */}
          <div className="space-y-4">

            <h3 className="text-lg font-semibold">
              Order Summary
            </h3>

            {/* Rows */}
            <div className="space-y-3 text-sm">

              <div className="flex justify-between text-gray-700">
                <span>Subtotal (14 items)</span>
                <span>$81,589.00</span>
              </div>

              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-$31,500.00</span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Shipping fee</span>
                <span>Calculated at checkout</span>
              </div>

            </div>

            <hr />

            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-xl font-bold text-[#900036]">
                $61,009.00
              </span>
            </div>

          </div>

          {/* Checkout Button */}
          <button
            type="button"
            className="w-full bg-[#900036] text-white py-3 rounded-full font-medium hover:opacity-90 transition"
          >
            Checkout
          </button>

        </div>

      </div>

    </div>
  )
}

export default CheckoutContainer