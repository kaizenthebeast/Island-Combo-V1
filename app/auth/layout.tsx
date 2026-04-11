import AuthNavbar from "./components/authNavbar";
import Footer from "@/components/public/layout/Footer";

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