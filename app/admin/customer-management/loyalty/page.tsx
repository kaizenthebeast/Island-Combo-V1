import { getLoyverseCards } from '@/lib/admin/loyalty'
import LoyverseCardsClient from './LoyverseCardsClient'

// Admin: migrate the store's existing (already-generated) Loyverse loyalty cards
// + balances. Customers later claim a card from the web app to credit the points.
const LoyaltyCardsPage = async () => {
  const result = await getLoyverseCards()
  const rows = result.success ? result.rows : []
  return <LoyverseCardsClient initialRows={rows} />
}

export default LoyaltyCardsPage
