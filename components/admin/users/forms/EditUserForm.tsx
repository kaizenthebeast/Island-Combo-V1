'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { editUserSchema, type EditUserFormValues } from '@/form-schema/userSchema'
import { updateUser } from '@/lib/users'
import { UserFields } from './UserUIForm'
import type { AdminStaff } from '@/types/users'

type Props = {
  user: AdminStaff
  onSuccess: () => void
  onCancel: () => void
}

export function EditUserForm({ user, onSuccess, onCancel }: Props) {
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

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {errors.root && (
          <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
            <p className="text-[12px] text-rose-700 font-medium">
              {errors.root.message}
            </p>
          </div>
        )}

        <UserFields />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-slate-800 px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-900 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>

      </form>
    </FormProvider>
  )
}