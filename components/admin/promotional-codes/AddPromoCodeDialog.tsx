'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog'
import { AddPromoCodeForm } from '@/components/admin/promotional-codes/forms/AddPromoCodeForm'
import type { AddPromoCodeFormValues } from '@/features/promotions/validations/promo-code'

type Props = {
  open: boolean
  onClose: () => void
}

export default function AddPromoCodeDialog({ open, onClose }: Props) {
  const router = useRouter()

  const handleSuccess = (_data: AddPromoCodeFormValues) => {
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
          <DialogTitle>Create Promo Code</DialogTitle>
          <DialogDescription>Fill in the details below.</DialogDescription>
        </DialogHeader>

        <AddPromoCodeForm
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
