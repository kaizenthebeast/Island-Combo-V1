"use client";

import React, { useEffect } from "react";
import { useFavoriteStore } from "@/store/favoriteStore"; 

const FavoriteCount = () => {
    const totalFavQty = useFavoriteStore((state) => state.totalFavQty); 
    const fetchFavorite = useFavoriteStore((state) => state.fetchFavorite);

    useEffect(() => {
        fetchFavorite();
    }, [fetchFavorite]);

    return <>{totalFavQty}</>;
};

export default FavoriteCount;