"use client";

import React, { useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { calculateCartTotals } from "@/helper/cartUtils";

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