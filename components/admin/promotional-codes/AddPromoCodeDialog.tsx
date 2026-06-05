'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { AddVoucherForm } from '@/components/admin/voucher/forms/AddVoucherForm'
import type { AddVoucherFormValues } from '@/lib/validators/voucher'

type Props = {
  open: boolean
  onClose: () => void
}

export default function AddVoucherDialog({ open, onClose }: Props) {
  const router = useRouter()

  const handleSuccess = (_data: AddVoucherFormValues) => {
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
          <DialogTitle>Create Voucher</DialogTitle>
          <DialogDescription>Fill in the details below.</DialogDescription>
        </DialogHeader>

        <AddVoucherForm
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}