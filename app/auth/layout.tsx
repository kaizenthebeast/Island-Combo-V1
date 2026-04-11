import AuthNavbar from "./components/authNavbar";

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
    </>
  );
}