'use client'

import { CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import AddCardSheet from '@/features/account/components/AddCardSheet'
import DeleteModal from '@/shared/components/common/modals/DeleteModal'
import { customToast } from '@/shared/components/common/modals/ToastCustom'
import { removeCard, setActiveCard, type SavedCard } from '@/features/account/api/cards'

const BRAND_LABEL: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
  diners: 'Diners',
  jcb: 'JCB',
  card: 'Card',
}

const pad2 = (n: number) => String(n).padStart(2, '0')

const MyCards = ({ cards }: { cards: SavedCard[] }) => {
  const router = useRouter()

  const handleSetActive = async (id: number) => {
    const res = await setActiveCard(id)
    if (!res.success) {
      customToast.error({ title: "Couldn't update active card", description: res.message })
      return
    }
    customToast.success({
      title: 'Active card updated',
      description: 'This card will be used to speed up checkout.',
    })
    router.refresh()
  }

  const handleRemove = async (id: number) => {
    const res = await removeCard(id)
    if (!res.success) {
      customToast.error({ title: "Couldn't remove card", description: res.message })
      return
    }
    customToast.success({ title: 'Card removed' })
    router.refresh()
  }

  return (
    <div className="bg-white border rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Saved Cards{cards.length > 0 && ` (${cards.length})`}
        </h3>
        {cards.length > 0 && (
          <AddCardSheet>
            <button type="button" className="text-sm text-brand font-medium hover:underline">
              Add
            </button>
          </AddCardSheet>
        )}
      </div>

      {cards.length === 0 ? (
        // Empty state — once a card is saved this is replaced by the list below.
        <div className="flex flex-col items-center justify-center text-center py-8 gap-2">
          <CreditCard className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Save your credit/debit cards today!</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Shop with confidence — we keep checkout secure, seamless and worry-free every time.
          </p>
          <AddCardSheet>
            <button
              type="button"
              className="mt-2 rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-brand-tint"
            >
              Add New Card
            </button>
          </AddCardSheet>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 rounded bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground">
                  {BRAND_LABEL[card.brand] ?? 'Card'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    •••• {card.last4}
                    {card.is_active && (
                      <span className="text-[10px] font-semibold uppercase bg-success-tint text-success px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pad2(card.exp_month)}/{card.exp_year}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {!card.is_active && (
                  <button
                    type="button"
                    onClick={() => handleSetActive(card.id)}
                    className="text-xs text-brand font-medium hover:underline"
                  >
                    Set active
                  </button>
                )}
                <DeleteModal subtitle="card" onSuccess={() => handleRemove(card.id)}>
                  <button type="button" className="text-xs text-muted-foreground font-medium hover:underline">
                    Remove
                  </button>
                </DeleteModal>
              </div>
            </div>
          ))}

          <p className="mt-1 text-[11px] text-muted-foreground">
            Only your <span className="font-medium text-foreground">active</span> card is used to speed
            up checkout. We never store your full card number or security code.
          </p>
        </div>
      )}
    </div>
  )
}

export default MyCards
