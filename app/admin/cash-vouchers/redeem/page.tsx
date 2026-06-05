import RedeemVoucherClient from './RedeemVoucherClient'

// Back-office Digital Voucher & Cash Redemption interface. Access is gated by the
// admin layout, and the underlying Search/Redeem APIs enforce staff/admin via RLS
// and the redeem_cash_voucher() SQL guard.
const RedeemVoucherPage = () => <RedeemVoucherClient />

export default RedeemVoucherPage
