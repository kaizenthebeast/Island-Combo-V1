'use client'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { AddCategoryForm } from '@/components/admin/category/forms/AddCategoryForm'
import { AddCategoryFormValues } from '@/form-schema/categorySchema'


type Props = {
  open: boolean
  onClose: () => void
}

export default function AddCategoryDialog({ open, onClose}: Props) {
  const router = useRouter()

  const handleSuccess = (data: AddCategoryFormValues) => {
    router.refresh()
    onClose()
  }

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
          <DialogTitle>Create Category</DialogTitle>
          <DialogDescription>Fill in the details below.</DialogDescription>
        </DialogHeader>

        <AddCategoryForm
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}