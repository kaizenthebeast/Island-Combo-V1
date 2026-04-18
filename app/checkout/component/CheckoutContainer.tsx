import OrderSummary from "@/components/public/OrderSummary"

const CheckoutContainer = () => {
    return (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 px-4 py-10">
            <div className="w-full lg:w-2/3 bg-blue-300">
                <OrderSummary />
            </div>
            <div>
                <h2>You must login or sign up first!</h2>
            </div>


        </div>
    )
}

export default CheckoutContainer