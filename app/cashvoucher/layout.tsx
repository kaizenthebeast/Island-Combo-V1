import CashVoucherNavbar from '@/components/features/cash-voucher/CashVoucherNavbar'
import Footer from '@/shared/components/layout/Footer'

export default function CashVoucherLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CashVoucherNavbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
