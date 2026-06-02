'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { EditUserForm } from '@/components/admin/users/forms/EditUserForm'
import type { AdminStaff } from '@/lib/types/users'


type Props = {
  user: AdminStaff | null
  open: boolean
  onClose: () => void 
}
export default function EditUserDialog({ user, open, onClose }: Props) {
  const router = useRouter()

  const handleSuccess = () => {
    router.refresh()
    onClose()
  }

  if (!user) return null

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
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update the details below. Changes are saved immediately.
          </DialogDescription>
        </DialogHeader>

        <EditUserForm
          user={user}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}