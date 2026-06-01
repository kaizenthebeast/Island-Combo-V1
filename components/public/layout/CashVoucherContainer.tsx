import React from 'react'
import Image from 'next/image'
import CashVoucherFormContainer from '@/components/functional-ui/cashVoucher/cashVoucherFormContainer'

const CashVoucherContainer = () => {
    return (
        <main className="min-h-svh max-w-7xl mx-auto grid grid-cols-2 gap-10 p-5 place-items-center">
            <div className="space-y-4">
                <h1 className="text-3xl font-bold text-brand">Send Cash Instantly</h1>
                <p>Easily send and redeem cash in just a few simple steps.
                    Follow the process below to ensure a smooth and secure transaction.
                </p>
                <>
                    <div className="flex items-center gap-3">
                        <div className="bg-brand p-2 rounded-full shrink-0">
                            <Image src="/images/fastshop.png" alt="Fast Shop" width={24} height={24} />
                        </div>
                        <div>
                            <h4 className="text-brand font-bold">Buy Cash Online</h4>
                            <p>Purchase your cash voucher online in just a few steps.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-brand p-2 rounded-full shrink-0">
                            <Image src="/images/qrcode.png" alt="QR Code" width={24} height={24} />
                        </div>
                        <div>
                            <h4 className="text-brand font-bold">Send with Ease</h4>
                            <p>Share the QR code with your recipient.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-brand p-2 rounded-full shrink-0">
                            <Image src="/images/storefront.png" alt="Storefront" width={24} height={24} />
                        </div>
                        <div>
                            <h4 className="text-brand font-bold">Claim at the Store</h4>
                            <p>Your recipient presents the QR code and a valid ID at the store to receive the cash. <a href="#" className="text-brand underline">Island Combo store.</a></p>
                        </div>
                    </div>
                </>
            </div>
            <CashVoucherFormContainer />
        </main>
    )
}

export default CashVoucherContainer