import { getLoyverseCards } from '@/features/loyalty/api/admin'
import LoyaltyClient from './LoyaltyClient'

// Combined Loyalty back office: member points/profile (Members tab) + physical
// card linking and Loyverse migration (Cards tab).
const LoyaltyPage = async () => {
  const result = await getLoyverseCards()
  const rows = result.success ? result.rows : []
  return <LoyaltyClient initialCards={rows} />
}

export default LoyaltyPage
