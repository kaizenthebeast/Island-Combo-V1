import React from 'react'
import CheckoutContainer from '@/components/public/layout/CheckoutContainer'
import { Suspense } from 'react';

const page = () => {
  return (
      <Suspense>
        <CheckoutContainer />
      </Suspense>
  )
}

export default page