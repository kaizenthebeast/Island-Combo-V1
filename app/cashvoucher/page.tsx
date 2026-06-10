import CashVoucherContainer from '@/features/cash-vouchers/components/CashVoucherContainer'

// Render per-request so the nonce-based CSP (set in proxy.ts) can stamp its
// nonce onto Next's scripts. A statically prerendered page ships scripts with
// no nonce, which `strict-dynamic` blocks in modern browsers.
export const dynamic = 'force-dynamic'

const CashVoucherPage = () => {
  return <CashVoucherContainer />
}

export default CashVoucherPage
