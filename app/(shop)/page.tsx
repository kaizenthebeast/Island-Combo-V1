import HeroBanner from "@/features/home/components/HeroBanner";
import ProductCategory from "@/features/products/components/ProductCategories";
import SaleAndPromos from "@/features/home/components/SaleAndPromos";
import CashVoucherBanner from "@/features/cash-vouchers/components/CashVoucherBanner";
import ProductContainer from "@/features/products/components/ProductContainer";
import { PromotionAdsSection } from "@/features/banners/components/PromotionAdsSection";
import { getBanner, getPromotionAds } from "@/features/banners/api/banner";

export default async function Home() {
  // Live admin-managed content only; rows arrive with image_src already signed
  // against the private promotional-images bucket.
  const [banners, landingAds] = await Promise.all([
    getBanner(true),
    getPromotionAds("landing", true),
  ]);

  return (
    <section className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <HeroBanner banners={banners} />
      <ProductCategory />
      <PromotionAdsSection ads={landingAds} />
      <SaleAndPromos />
      <CashVoucherBanner />
      <ProductContainer />
    </section>
  );
}
