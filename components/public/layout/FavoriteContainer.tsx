// components/public/layout/FavoriteContainer.tsx
'use client'
import { useEffect } from 'react'
import { useFavoriteStore } from '@/store/favoriteStore'
import Image from 'next/image'
import Link from 'next/link'
import FavoriteCard from '@/components/card/FavoriteCard'

const FavoriteContainer = () => {
  const { favorites, fetchFavorite, error } = useFavoriteStore()

  useEffect(() => {
    fetchFavorite()
  }, [fetchFavorite])

  if (error) {
    return <p className="text-center text-red-500">{error}</p>
  }

  if (favorites.length === 0) {
    return (
      <section className="w-full min-h-svh flex items-center justify-center">
        <div className="flex flex-col items-center text-center gap-4 max-w-xs w-full">
          <Image
            src="/images/favoriteIcon.png"
            width={48}
            height={48}
            className="object-contain"
            alt="favorite-icon"
          />
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
            Your Favorite is empty.
          </h2>
          <p className="text-sm md:text-base text-gray-500">
            Start shopping and find your next favourites look
          </p>
          <Link href='/' className="w-full mt-2 px-6 py-2 rounded-full border border-brand text-brand hover:bg-brand hover:text-white transition text-center text-sm md:text-base">
            Let's Go Shopping!
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
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 w-full place-items-center'>
        {favorites.map((favorite) => (
          <FavoriteCard key={favorite.product_id} product={favorite} />
        ))}
      </div>
    </section>
  )
}

export default FavoriteContainer