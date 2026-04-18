'use client'
import React from 'react'
import Image from 'next/image'
import QuantityButton from '../../functional-ui/QuantityButton'
import { X } from 'lucide-react';

const OrderSummary = () => {
    return (
        <div className="flex flex-col space-y-4 w-full">
            <h2 className="title-header">Order Summary</h2>

            {/* Product Card */}
            <div className="grid grid-cols-[160px_1fr] gap-4 h-36">

                {/* Image (fixed size) */}
                <div className="relative w-[120px] h-[120px] bg-gray-100 rounded-md overflow-hidden">
                    <Image
                        src="/images/placeholder.png"
                        alt="product"
                        fill
                        loading='lazy'
                        className="object-cover"
                    />
                </div>

                {/* Details (takes more space) */}
                <div className="flex flex-col h-full space-y-2">

                    {/* Top row: title + remove */}
                    <div className="flex justify-between items-start">
                        <h4 className="text-base font-medium line-clamp-2">
                            Gamma 24 Medium Hard Case Zipperclass
                        </h4>
                        <button
                            type="button"
                            className="text-sm text-red-500 hover:text-red-700"
                        >
                            <X />
                        </button>
                    </div>
                    <div>
                        <p className='text-sm text-slate-100'>Size: M</p>
                    </div>
                    <div className='flex items-center justify-between flex-wrap'>
                        <QuantityButton />
                        {/* Pricing */}
                        <div className='flex items-center gap-2'>
                            <p className="text-2xl font-bold text-[#900036]">$400</p>
                            <div className='flex gap-3 text-[#900036] items-center'>
                                <p className="text-md line-through">
                                    $399
                                </p>
                                <p className="text-sm bg-[#900036] text-white p-1 rounded-md">
                                    -29%
                                </p>
                            </div>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    )
}

export default OrderSummary