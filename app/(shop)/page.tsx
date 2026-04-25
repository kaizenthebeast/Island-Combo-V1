import { Suspense } from "react";
import ProductContainer from "@/components/public/layout/ProductContainer";



export default function Home() {
  return (
        <Suspense fallback={<div>Loading...</div>} > 
          <ProductContainer />
        </Suspense>
  );
}
