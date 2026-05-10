'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { EditCategoryForm } from '@/components/admin/category/forms/EditCategoryForm'
import { CategoryOption } from '@/components/admin/category/forms/category-form-shared-UI'
import type { Category } from '@/types/category'

type Props = {
  selectedCategory: Category | null   // the category being edited
  parentOptions: CategoryOption[]     // all categories for the parent dropdown
  open: boolean
  onClose: () => void
}

export default function EditCategoryDialog({ selectedCategory, parentOptions, open, onClose }: Props) {
  const router = useRouter()

  const handleSuccess = () => {
    router.refresh()
    onClose()
  }

  if (!selectedCategory) return null

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
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update the details below. Changes are saved immediately.
          </DialogDescription>
        </DialogHeader>

        <EditCategoryForm
          selectedCategory={selectedCategory}
          parentOptions={parentOptions}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}