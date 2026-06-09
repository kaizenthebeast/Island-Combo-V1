"use client";

import React, { useEffect } from "react";
import { useWishlistStore } from "@/features/wishlist/stores/wishlist-store";

const WishlistCount = () => {
    const totalWishlistQty = useWishlistStore((state) => state.totalWishlistQty);
    const fetchWishlist = useWishlistStore((state) => state.fetchWishlist);

    useEffect(() => {
        fetchWishlist();
    }, [fetchWishlist]);

    return <>{totalWishlistQty}</>;
};

export default WishlistCount;
