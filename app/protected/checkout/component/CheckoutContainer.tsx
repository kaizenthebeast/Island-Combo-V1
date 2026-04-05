import CheckoutCard from '@/components/card/CheckoutCard';
import OrderSummaryContainer from '@/components/private/layout/OrderSummaryContainer';
import { User } from '@/lib/users';



const CheckoutContainer = async () => {
    const user = await User.current();


    return (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 px-4 py-10">
            <div className="w-full lg:w-2/3">
                <OrderSummaryContainer />
            </div>

            <div className="w-full lg:w-1/3">
                <CheckoutCard user={user} />
            </div>


        </div>
    )
}

export default CheckoutContainer