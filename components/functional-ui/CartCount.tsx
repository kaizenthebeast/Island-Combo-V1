'use client'
import React from 'react'
import { useCartStore } from '@/store/cartStore'

const CartCount = () => {
    const { cart } = useCartStore();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
    return (
        <>{totalItems}</>
    )
}

export default CartCount