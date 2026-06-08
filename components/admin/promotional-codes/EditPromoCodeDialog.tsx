'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { EditPromoCodeForm } from '@/components/admin/promotional-codes/forms/EditPromoCodeForm'
import type { EditPromoCodeFormValues } from '@/lib/validations/promo-code'
import type { PromoCode } from '@/types/promo-code'

type Props = {
  open: boolean
  onClose: () => void
  selectedPromoCode: PromoCode | null
}

export default function EditPromoCodeDialog({ open, onClose, selectedPromoCode }: Props) {
  const router = useRouter()

  const handleSuccess = (_data: EditPromoCodeFormValues) => {
    router.refresh()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose()
    }}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit Promo Code</DialogTitle>
          <DialogDescription>Update the promo code details below.</DialogDescription>
        </DialogHeader>

        {selectedPromoCode && (
          <EditPromoCodeForm
            promoCode={selectedPromoCode}
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
