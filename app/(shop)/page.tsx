import { Suspense } from "react";
import ProductContainer from "@/components/public/layout/ProductContainer";



export default function Home() {
  return (
      <div className="flex min-h-svh max-w-7xl mx-auto items-center justify-center  md:p-5">
        <Suspense fallback={<div>Loading...</div>} > 
          <ProductContainer />
        </Suspense>

      </div>
  );
}
