'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { EditProductForm } from '@/components/admin/products/forms/EditProductForm'
import type { AdminProduct } from '@/lib/types/product'

type Props = {
  product: AdminProduct | null
  open: boolean
  onClose: () => void
}

export default function EditProductDialog({ product, open, onClose }: Props) {
  const router = useRouter()

  const handleSuccess = () => {
    router.refresh()
    onClose()
  }

  // Don't render the form at all if no product is selected —
  // avoids stale form state when the dialog is closed and reopened
  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose()
    }}>
      <DialogContent
        className="max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the details below. Changes are saved immediately.
          </DialogDescription>
        </DialogHeader>

        <EditProductForm
          product={product}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}