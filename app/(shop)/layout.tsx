import Navbar from "@/components/public/layout/Navbar";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* MAIN ECOMMERCE NAVBAR */}
      <Navbar />

      {/* PAGE CONTENT */}
      <main className="min-h-screen">
        {children}
      </main>
    </>
  );
}