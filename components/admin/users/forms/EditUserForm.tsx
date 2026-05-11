'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { editUserSchema, type EditUserFormValues } from '@/form-schema/userSchema'
import { updateUser } from '@/lib/users'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { UserFields } from './UserUIForm'
import type { AdminUser } from '@/types/users'

type Props = {
    user: AdminUser
    onSuccess: () => void
    onCancel: () => void
}

export function EditUserForm({ user, onSuccess, onCancel }: Props) {
    const form = useForm<EditUserFormValues>({
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

    const { formState: { isSubmitting, errors } } = form

    const onSubmit = async (data: EditUserFormValues) => {
        const result = await updateUser(user.user_id, data)

        if (!result.success) {
            form.setError('root', { message: result.message })
            return
        }

        onSuccess()
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <UserFields />

                {errors.root && (
                    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
                        <p className="text-[12px] font-medium text-rose-700">{errors.root.message}</p>
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving…' : 'Save changes'}
                    </Button>
                </div>

            </form>
        </Form>
    )
}