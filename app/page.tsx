import { Suspense } from "react";
import ProductContainer from "@/components/public/layout/ProductContainer";

export default function Home() {

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <Suspense fallback={<div>Loading...</div>}>
          <ProductContainer />
        </Suspense>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>

          </p>

        </footer>
      </div>
    </main>
  );
}
