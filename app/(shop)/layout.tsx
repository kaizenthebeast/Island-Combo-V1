import Footer from "@/components/public/layout/Footer";
import Navbar from "@/components/public/layout/Navbar";
import NavbarGate from "@/components/public/layout/NavbarGate";
import MobileBottomNav from "@/components/public/layout/MobileBottomNav";
import { createClient } from "@/lib/supabase/server";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = !!data?.claims?.email;

  return (
    <>
      <NavbarGate>
        <Navbar />
      </NavbarGate>
      <main className="min-h-screen pb-16 md:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav isAuthenticated={isAuthenticated} />
    </>
  );
}
