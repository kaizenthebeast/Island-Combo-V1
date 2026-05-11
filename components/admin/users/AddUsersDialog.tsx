'use client'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { AddUserForm } from '@/components/admin/users/forms/AddUserForm'
import { AddUserFormValues } from '@/form-schema/userSchema'

type Props = {
  open: boolean
  onClose: () => void
}

export default function AddUserDialog({ open, onClose }: Props) {
  const router = useRouter();
  const handleSuccess = (data: AddUserFormValues) => {
    router.refresh();
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
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <AddUserForm onSuccess={handleSuccess} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  )
}