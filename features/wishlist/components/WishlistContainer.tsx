'use client'
import { useEffect } from 'react'
import { useWishlistStore } from '@/features/wishlist/stores/wishlist-store'
import Image from 'next/image'
import Link from 'next/link'
import WishlistCard from '@/features/wishlist/components/WishlistCard'

const WishlistContainer = () => {
  const { wishlist, fetchWishlist, error } = useWishlistStore()

  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  if (error) {
    return <p className="text-center text-danger">{error}</p>
  }

  if (wishlist.length === 0) {
    return (
      <section className="w-full min-h-svh flex items-center justify-center">
        <div className="flex flex-col items-center text-center gap-4 max-w-xs w-full">
          <Image
            src="/images/favoriteIcon.png"
            width={48}
            height={48}
            className="object-contain"
            alt="wishlist-icon"
          />
          <h2 className="text-xl md:text-2xl font-semibold text-foreground">
            Your wishlist is empty.
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Start shopping and save items you love to your wishlist.
          </p>
          <Link href='/' className="w-full mt-2 px-6 py-2 rounded-full border border-brand text-brand hover:bg-brand hover:text-white transition text-center text-sm md:text-base">
            Let&apos;s Go Shopping!
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className='max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6'>
      <h2 className="title-header text-lg sm:text-xl md:text-2xl">
        Wishlist
      </h2>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 w-full items-stretch'>
        {wishlist.map((item) => (
          <WishlistCard key={item.product_id} product={item} />
        ))}
      </div>
    </section>
  )
}

export default WishlistContainer
