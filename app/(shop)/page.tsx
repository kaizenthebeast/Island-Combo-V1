import HeroBanner from "@/components/features/home/HeroBanner";
import ProductCategory from "@/features/products/components/ProductCategories";
import SaleAndPromos from "@/components/features/home/SaleAndPromos";
import CashVoucherBanner from "@/features/cash-vouchers/components/CashVoucherBanner";
import ProductContainer from "@/features/products/components/ProductContainer";

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
