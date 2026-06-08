"use client";

import React, { useEffect } from "react";
import { useCartStore } from "@/stores/cart-store";
import { calculateCartTotals } from "@/lib/utils/cart-totals";

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