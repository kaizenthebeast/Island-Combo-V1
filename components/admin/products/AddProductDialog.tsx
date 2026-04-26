'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { AddProductForm } from '@/components/admin/forms/AddProductForm'
import { AddProductFormValues } from '@/form-schema/addProductSchema'

type Props = {
  open: boolean
  onClose: () => void
}

export default function AddProductDialog({ open, onClose }: Props) {
  const handleSuccess = (data: AddProductFormValues) => {
    console.log('Product created:', data)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) return
      }}
    >
      <DialogContent
        className="max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
          <DialogDescription>
            Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <AddProductForm onSuccess={handleSuccess} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  )
}