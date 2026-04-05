import React from 'react'
import CheckoutCard from '@/components/card/CheckoutCard'
import OrderSummaryContainer from '@/components/private/layout/OrderSummaryContainer'
import { Suspense } from 'react'

const CheckoutPage = () => {
    return (
        <div className="flex justify-between">
            <OrderSummaryContainer />
            <Suspense>
                <CheckoutCard />
            </Suspense>

        </div>
    )
}

export default CheckoutPage