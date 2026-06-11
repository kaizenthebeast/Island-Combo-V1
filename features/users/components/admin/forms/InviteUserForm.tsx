'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { inviteUserSchema, type InviteUserFormValues } from '@/features/account/validations/user'
import { apiFetch, ApiError } from '@/shared/lib/http/client'
import { Field, Input, Select } from './UserUIForm'

type Props = {
  onSuccess: (email: string) => void
  onCancel: () => void
}

const msg = (error: { message?: unknown } | undefined): string | undefined =>
  error?.message as string | undefined

export function InviteUserForm({ onSuccess, onCancel }: Props) {
  const methods = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      role: 'staff',
    },
  })

  const { register, handleSubmit, setError, formState: { isSubmitting, errors } } = methods

  const onSubmit = async (data: InviteUserFormValues) => {
    try {
      await apiFetch('/api/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      onSuccess(data.email)
    } catch (err) {
      setError('root', {
        message: err instanceof ApiError ? err.message : 'Failed to send the invitation',
      })
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" required error={msg(errors.first_name)}>
            <Input {...register('first_name')} placeholder="Juan" />
          </Field>
          <Field label="Last name" required error={msg(errors.last_name)}>
            <Input {...register('last_name')} placeholder="dela Cruz" />
          </Field>
        </div>

        <Field
          label="Email"
          required
          error={msg(errors.email)}
          hint="The invitation link will be sent to this address."
        >
          <Input {...register('email')} type="email" placeholder="user@example.com" />
        </Field>

        <Field
          label="Role"
          required
          error={msg(errors.role)}
          hint="The account is tagged with this role as soon as the invite is accepted."
        >
          <Select {...register('role')}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>

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
            {isSubmitting ? 'Sending…' : 'Send invitation'}
          </button>
        </div>

      </form>
    </FormProvider>
  )
}
