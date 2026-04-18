import OrderSummary from "@/components/public/layout/OrderSummary"

const CheckoutContainer = () => {
    return (
        <div className="max-w-7xl mx-auto md:p-5 flex flex-wrap">
            <div className="md:w-2/3 w-full p-2">
                <OrderSummary />
            </div>
            <div>
                <h2>You must login or sign up first!</h2>
            </div>


        </div>
    )
}

export default CheckoutContainer