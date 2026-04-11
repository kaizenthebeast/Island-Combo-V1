import { Suspense } from "react";
import ProductContainer from "@/components/public/layout/ProductContainer";



export default function Home() {
  return (
      <div className="flex min-h-svh w-full items-center justify-center  md:py-10">
        <Suspense fallback={<div>Loading...</div>} >
          <ProductContainer />
        </Suspense>

      </div>
  );
}
