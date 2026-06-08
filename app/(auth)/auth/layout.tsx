import AuthNavbar from "@/components/features/auth/AuthNavbar";
import Footer from "@/components/layout/Footer";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthNavbar />

      {/* PAGE CONTENT */}
      <main className="min-h-screen">
        {children}
      </main>

      <Footer />
    </>
  );
}