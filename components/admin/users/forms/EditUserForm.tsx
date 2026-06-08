'use client'

import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { editUserSchema, type EditUserFormValues } from '@/lib/validations/user'
import { updateUser, restoreUser } from '@/lib/admin/users/users'
import { UserFields } from './UserUIForm'
import { ArchiveRestore } from 'lucide-react'          
import type { AdminStaff } from '@/types/users'

type Props = {
  user: AdminStaff
  onSuccess: () => void
  onCancel: () => void
}

export function EditUserForm({ user, onSuccess, onCancel }: Props) {
  const [isRestoring, setIsRestoring] = useState(false) 

  const methods = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      first_name: user.first_name ?? '',
      last_name:  user.last_name  ?? '',
      email:      user.email      ?? '',
      phone_text: user.phone_text ?? '',
      sex:        user.sex        ?? undefined,
      age:        user.age        ?? undefined,
      role:       user.role,
    },
  })

  const { handleSubmit, setError, formState: { isSubmitting, errors } } = methods

  const onSubmit = async (data: EditUserFormValues) => {
    const result = await updateUser(user.user_id, data)
    if (!result.success) {
      setError('root', { message: result.message })
      return
    }
    onSuccess()
  }


  const handleRestore = async () => {
    setIsRestoring(true)
    try {
      const result = await restoreUser(user.user_id)
      if (!result.success) throw new Error(result.message)
      onSuccess()
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Failed to restore user'
      })
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {errors.root && (
          <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5">
            <p className="text-[12px] text-danger font-medium">
              {errors.root.message}
            </p>
          </div>
        )}

      
        {!user.is_active && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning-tint px-3 py-2.5">
            <div className="flex items-center gap-2">
              <ArchiveRestore className="h-4 w-4 shrink-0 text-warning" />
              <p className="text-[12px] text-warning font-medium">
                This staff member is deactivated and cannot access the system.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRestore}
              disabled={isRestoring}
              className="shrink-0 rounded-md bg-warning hover:bg-warning disabled:opacity-50 px-3 py-1.5 text-[12px] font-medium text-white transition-colors"
            >
              {isRestoring ? 'Restoring…' : 'Restore'}
            </button>
          </div>
        )}

        <UserFields />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>

      </form>
    </FormProvider>
  )
}