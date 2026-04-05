// app/checkout/page.tsx
import React, { Suspense } from 'react';
import CheckoutCard from '@/components/card/CheckoutCard';
import OrderSummaryContainer from '@/components/private/layout/OrderSummaryContainer';

const CheckoutPage = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 px-4 py-10">
      {/* Order Summary - fixed width on large screens */}
      <div className="w-full lg:w-2/3">
        <OrderSummaryContainer />
      </div>

      {/* Checkout Form - takes remaining space */}
      <div className="w-full lg:w-1/3">
        <Suspense fallback={<div>Loading Checkout...</div>}>
          <CheckoutCard />
        </Suspense>
      </div>
    </div>
  );
};

export default CheckoutPage;