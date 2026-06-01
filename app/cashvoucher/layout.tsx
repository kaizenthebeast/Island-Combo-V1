import CashVoucherNavbar from '@/components/public/layout/CashVoucherNavbar'
import Footer from '@/components/public/layout/Footer'

export default function CashVoucherLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CashVoucherNavbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
