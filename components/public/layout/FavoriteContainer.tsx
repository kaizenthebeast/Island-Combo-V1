import React from 'react'
import { getFavorite } from '@/lib/favorite'

import Link from 'next/link';

import { Heart } from 'lucide-react'
import ProductCard from '@/components/card/ProductCard';
import FavoriteCard from '@/components/card/FavoriteCard';
const FavoriteContainer = async () => {
  const favoriteList = await getFavorite();


  if (favoriteList.length === 0) {
    return (
      <section className="max-w-7xl mx-auto p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center text-center gap-4">

          <div className="p-4 rounded-full bg-[#900036]">
            <Heart className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
            Your Favorite is empty.
          </h2>

          <p className="text-sm md:text-base text-gray-500">
            Start shopping and find your next favourites look
          </p>

          <Link href='/' className="mt-2 px-6 py-2 rounded-full border border-[#900036] text-red-500 hover:bg-[#900036] hover:text-white transition">
            Let’s Go Shopping!
          </Link>

        </div>
      </section>
    )
  }
  return (
    <section className='max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6'>
      <h2 className="title-header text-lg sm:text-xl md:text-2xl">
        Favorites
      </h2>
        {/* Display all products */}
        {favoriteList.map((favorite) => (
            <FavoriteCard  key={favorite.product_id} product={favorite}/>
        ))}

    </section>
  )
}

export default FavoriteContainer