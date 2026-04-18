import React from 'react'
import CheckoutContainer from './component/CheckoutContainer'
import { Suspense } from 'react';

const page = () => {
  return (
      <Suspense>
        <CheckoutContainer />
      </Suspense>
  )
}

export default page