import BannerContentClient from './BannerContentClient'
import { getBanner, getPromotionAds } from '@/features/banners/api/banner'

// Admin banner management: hero slider banners + placed promotion ads.
// Reads are SSR (admins see every row via RLS, including inactive/expired);
// each row arrives with `image_src` — a signed URL into the private
// promotional-images bucket — already resolved by the lib.
const BannerPage = async () => {
  const [banners, ads] = await Promise.all([getBanner(), getPromotionAds()])
  return <BannerContentClient banners={banners} ads={ads} />
}

export default BannerPage
