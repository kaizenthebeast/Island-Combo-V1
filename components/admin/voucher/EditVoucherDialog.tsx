'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { EditVoucherForm } from '@/components/admin/voucher/forms/EditVoucherForm'
import type { VoucherFormValues } from '@/form-schema/voucherSchema'
import type { Voucher } from '@/types/voucher'

type Props = {
  open: boolean
  onClose: () => void
  selectedVoucher: Voucher | null
}

export default function EditVoucherDialog({ open, onClose, selectedVoucher }: Props) {
  const router = useRouter()

  const handleSuccess = (_data: VoucherFormValues) => {
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
          <DialogTitle>Edit Voucher</DialogTitle>
          <DialogDescription>Update the voucher details below.</DialogDescription>
        </DialogHeader>

        {selectedVoucher && (
          <EditVoucherForm
            voucher={selectedVoucher}
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}