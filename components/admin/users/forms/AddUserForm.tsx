'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addUserSchema, type AddUserFormValues } from '@/form-schema/userSchema'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { UserFields } from './UserUIForm'

type Props = {
    onSuccess: (data: AddUserFormValues) => void
    onCancel: () => void
}

export function AddUserForm({ onSuccess, onCancel }: Props) {
    const [serverError, setServerError] = useState<string | null>(null)

    const form = useForm<AddUserFormValues>({
        resolver: zodResolver(addUserSchema),
        defaultValues: {
            email:      '',
            password:   '',
            first_name: '',
            last_name:  '',
            phone_text: '',
            role:       'customer',
        },
    })

    const { formState: { isSubmitting } } = form

    const onSubmit = async (values: AddUserFormValues) => {
        setServerError(null)

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            })

            const json = await res.json()

            if (!res.ok) {
                setServerError(json.message ?? 'Something went wrong.')
                return
            }

            onSuccess(values)
        } catch {
            setServerError('Network error. Please try again.')
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <UserFields showAccount />

                {serverError && (
                    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
                        <p className="text-[12px] font-medium text-rose-700">{serverError}</p>
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating…' : 'Create user'}
                    </Button>
                </div>

            </form>
        </Form>
    )
}