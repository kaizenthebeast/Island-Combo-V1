'use client'

import React from 'react'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

/**
 * Loads the PayPal SDK once for a flow (preload), so card fields are ready by the
 * time the user reaches the payment step. If the client id is missing we just
 * render children; CashVoucherPayment shows the config message.
 *
 * Shared by the cash-voucher flow and the order/checkout payment step.
 */
export const PayPalSdk = ({ children }: { children: React.ReactNode }) => {
  if (!PAYPAL_CLIENT_ID) return <>{children}</>
  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID,
        components: 'card-fields',
        currency: 'USD',
        intent: 'capture',
      }}
    >
      {children}
    </PayPalScriptProvider>
  )
}
