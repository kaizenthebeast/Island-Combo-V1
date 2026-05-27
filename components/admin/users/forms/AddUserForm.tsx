'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addUserSchema, type AddUserFormValues } from '@/form-schema/userSchema'
import { UserFields } from './UserUIForm'

type Props = {
  onSuccess: (data: AddUserFormValues) => void
  onCancel: () => void
}

export function AddUserForm({ onSuccess, onCancel }: Props) {
  const methods = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone_text: '',
      role: 'staff',
    },
  })

  const { handleSubmit, setError, formState: { isSubmitting, errors } } = methods

  const onSubmit = async (values: AddUserFormValues) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const json = await res.json()

      if (!res.ok) {
        setError('root', { message: json.message ?? 'Something went wrong.' })
        return
      }

      onSuccess(values)
    } catch {
      setError('root', { message: 'Network error. Please try again.' })
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

        <UserFields showAccount />

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
            {isSubmitting ? 'Creating…' : 'Create user'}
          </button>
        </div>

      </form>
    </FormProvider>
  )
}