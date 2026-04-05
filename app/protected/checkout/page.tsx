import React from 'react'
import CheckoutContainer from './component/CheckoutContainer'
import { Suspense } from 'react';

const page = () => {
  return (
    <div>
      <Suspense>
        <CheckoutContainer />
      </Suspense>
    </div>
  )
}

export default page