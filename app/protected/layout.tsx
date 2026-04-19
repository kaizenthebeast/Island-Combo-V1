import Footer from "@/components/public/layout/Footer";
import Navbar from "@/components/public/layout/Navbar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <Navbar />
      {children}
      <Footer />
    </main>
  );
}