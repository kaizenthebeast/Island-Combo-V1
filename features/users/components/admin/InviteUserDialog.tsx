'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog'
import { InviteUserForm } from '@/features/users/components/admin/forms/InviteUserForm'
import { customToast } from '@/shared/components/common/modals/ToastCustom'

type Props = {
  open: boolean
  onClose: () => void
}

export default function InviteUserDialog({ open, onClose }: Props) {
  const router = useRouter()

  const handleSuccess = (email: string) => {
    customToast.success({
      title: 'Invitation sent',
      description: `${email} will receive an email link to set their password.`,
    })
    router.refresh()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose()
    }}>
      <DialogContent
        className="max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Invite Staff</DialogTitle>
          <DialogDescription>
            Send an email invitation for a new staff or admin account. The
            invitee sets their own password.
          </DialogDescription>
        </DialogHeader>

        <InviteUserForm
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
