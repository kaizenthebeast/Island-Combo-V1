"use client";

import React, { useEffect } from "react";
import { useCartStore } from "@/features/cart/stores/cart-store";
import { calculateCartTotals } from "@/shared/utils/cart-totals";

const CartCount = () => {
  const cart = useCartStore((state) => state.cart);
  const fetchCart = useCartStore((state) => state.fetchCart);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const { totalQty } = calculateCartTotals(cart);

  return <>{totalQty}</>;
};

export default CartCount;