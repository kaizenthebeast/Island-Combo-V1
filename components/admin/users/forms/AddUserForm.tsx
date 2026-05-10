'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { addUserSchema, type AddUserFormValues } from '@/form-schema/Adduserschema'

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { PlusIcon, Trash2Icon } from 'lucide-react'

function FieldRow({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
}

type Props = {
    onSuccess: (data: AddUserFormValues) => void
    onCancel: () => void
}

export function AddUserForm({ onSuccess, onCancel }: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)

    const form = useForm<AddUserFormValues>({
        resolver: zodResolver(addUserSchema),
        defaultValues: {
            email: '',
            password: '',
            first_name: '',
            last_name: '',
            phone_text: '',
            role: 'customer',
        },
    })

    const onSubmit = async (values: AddUserFormValues) => {
        setIsSubmitting(true)
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
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* ── Account ───────────────────────────────────────────── */}
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Account
                    </p>
                    <FieldRow>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email <span className="text-rose-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input placeholder="user@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password <span className="text-rose-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="Min. 6 characters" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </FieldRow>
                </div>

                <Separator />

                {/* ── Profile ───────────────────────────────────────────── */}
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Profile
                    </p>
                    <FieldRow>
                        <FormField
                            control={form.control}
                            name="first_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>First name <span className="text-rose-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input placeholder="Juan" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="last_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Last name <span className="text-rose-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input placeholder="dela Cruz" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </FieldRow>

                    <FieldRow>
                        <FormField
                            control={form.control}
                            name="phone_text"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone</FormLabel>
                                    <FormControl>
                                        <Input placeholder="+63 912 345 6789" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="age"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Age</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min={0}
                                            placeholder="25"
                                            {...field}
                                            // ✅ age is z.number() so we parse it
                                            onChange={(e) =>
                                                field.onChange(
                                                    e.target.value === '' ? undefined : Number(e.target.value)
                                                )
                                            }
                                            value={field.value ?? ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </FieldRow>

                    <FieldRow>
                        <FormField
                            control={form.control}
                            name="sex"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sex</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value ?? ''}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role <span className="text-rose-500">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="customer">Customer</SelectItem>
                                            <SelectItem value="staff">Staff</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </FieldRow>
                </div>

                {/* ── Server error ───────────────────────────────────────── */}
                {serverError && (
                    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
                        <p className="text-[12px] font-medium text-rose-700">{serverError}</p>
                    </div>
                )}

                {/* ── Actions ───────────────────────────────────────────── */}
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