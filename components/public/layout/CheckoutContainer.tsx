import OrderSummary from "@/components/public/layout/OrderSummary"

const CheckoutContainer = () => {
    return (
        <div className="section-container">
            <div className="w-full lg:w-2/3">
                <OrderSummary />
            </div>
            <div>
                <h2>You must login or sign up first!</h2>
            </div>


        </div>
    )
}

export default CheckoutContainer