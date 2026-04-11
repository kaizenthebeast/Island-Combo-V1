import { Suspense } from "react";
import ProductContainer from "@/components/public/layout/ProductContainer";
import Footer from "@/components/public/layout/Footer";

export default function Home() {

  return (
    <main className="min-h-screen flex flex-col items-center relative">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <Suspense fallback={<div>Loading...</div>}>
          <ProductContainer />
        </Suspense>

      </div>
      <Footer />
    </main>
  );
}
