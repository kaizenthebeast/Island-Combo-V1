import HeroBanner from "@/components/public/layout/HeroBanner";
import ProductCategory from "@/components/public/layout/ProductCategories";
import SaleAndPromos from "@/components/public/layout/SaleAndPromos";
import CashVoucherBanner from "@/components/public/layout/CashVoucherBanner";
import ProductContainer from "@/components/public/layout/ProductContainer";

export default function Home() {
  return (
    <section className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <HeroBanner />
      <ProductCategory />
      <SaleAndPromos />
      <CashVoucherBanner />
      <ProductContainer />
    </section>
  );
}
