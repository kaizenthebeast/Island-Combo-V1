'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog'
import { customToast } from '@/shared/components/common/modals/ToastCustom'

// Lets a signed-in customer change their password using the SAME flow as
// "Forgot password": it hits /api/auth/forgot-password with their own email, so
// Supabase emails a secure reset link that lands on the update-password page.
const ChangePasswordButton = ({ email }: { email: string }) => {
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)

  const sendResetLink = async () => {
    setSending(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = await res.json()
      if (!res.ok || !result?.success) {
        throw new Error(result?.message ?? 'Something went wrong')
      }
      setOpen(false)
      customToast.success({
        title: 'Reset link sent',
        description: `We've emailed a password reset link to ${email}. Open it to set a new password.`,
      })
    } catch (e) {
      customToast.error({
        title: "Couldn't send reset link",
        description: e instanceof Error ? e.message : 'Please try again.',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button type="button" className="text-sm text-brand font-medium hover:underline">
          Change
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change your password</AlertDialogTitle>
          <AlertDialogDescription>
            We&apos;ll email a secure reset link to{' '}
            <span className="font-medium text-foreground">{email}</span>. Open it to set a new
            password — the same process as &ldquo;Forgot password&rdquo;.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault() // keep the dialog open until the request resolves
              sendResetLink()
            }}
            disabled={sending}
            className="bg-brand hover:bg-brand-hover"
          >
            {sending ? 'Sending…' : 'Send reset link'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ChangePasswordButton
