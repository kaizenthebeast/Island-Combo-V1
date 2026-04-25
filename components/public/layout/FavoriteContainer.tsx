import React from 'react'
import { getFavorite } from '@/lib/favorite'
import Link from 'next/link';

import { Heart } from 'lucide-react'
const FavoriteContainer = async () => {
  const favoriteList = await getFavorite();


  if (favoriteList.length === 0) {
    return (
      <section className="max-w-7xl mx-auto p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center text-center gap-4">

          <div className="p-4 rounded-full bg-gray-100">
            <Heart className="w-10 h-10 text-gray-500" />
          </div>

          <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
            Your Cart is empty.
          </h2>

          <p className="text-sm md:text-base text-gray-500">
            Start shopping and find your next favourites
          </p>

          <Link href='/' className="mt-2 px-6 py-2 rounded-full border border-[#900036] text-red-500 hover:bg-[#900036] hover:text-white transition">
            Let’s Go Shopping!
          </Link>

        </div>
      </section>
    )
  }
  return (
    <section className='max-w-7xl mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6'>
      <h2 className="title-header text-lg sm:text-xl md:text-2xl">
        Favorites

        {/* Display all products */}
      </h2>
    </section>
  )
}

export default FavoriteContainer