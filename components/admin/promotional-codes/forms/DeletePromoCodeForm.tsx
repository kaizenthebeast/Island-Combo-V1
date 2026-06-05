'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  promoCode: string
  onConfirm: () => Promise<void>
  onOpenChange: (open: boolean) => void
}

export default function DeletePromoCodeDialog({ open, promoCode, onConfirm, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Archive Promo Code</DialogTitle>
        </DialogHeader>

        <p className="text-[13px] text-muted-foreground">
          Are you sure you want to archive{' '}
          <span className="font-semibold text-foreground">{promoCode}</span>?
          Customers will no longer be able to use this code. You can restore it later.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
