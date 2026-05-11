'use client'

import { useFormContext } from 'react-hook-form'

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

// ─── Layout helper ────────────────────────────────────────────────────────────

function FieldRow({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
}

// ─── Props ────────────────────────────────────────────────────────────────────

type UserFieldsProps = {
    /** Show the Account section (email + password). Pass false for edit forms. */
    showAccount?: boolean
}

// ─── UserFields ───────────────────────────────────────────────────────────────
//
// Shared field groups for AddUserForm and EditUserForm.
// Must be rendered inside a <FormProvider> (react-hook-form).
//
// Usage (add):  <UserFields showAccount />
// Usage (edit): <UserFields />

export function UserFields({ showAccount = false }: UserFieldsProps) {
    const { control } = useFormContext()

    return (
        <div className="space-y-6">

            {/* ── Account (add only) ────────────────────────────────────── */}
            {showAccount && (
                <>
                    <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Account
                        </p>
                        <FieldRow>
                            <FormField
                                control={control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email <span className="text-rose-500">*</span></FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="user@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
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
                </>
            )}

            {/* ── Profile ───────────────────────────────────────────────── */}
            <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Profile
                </p>

                <FieldRow>
                    <FormField
                        control={control}
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
                        control={control}
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
                    {/* Email shown here only on edit (no Account section) */}
                    {!showAccount && (
                        <FormField
                            control={control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email <span className="text-rose-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="user@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    <FormField
                        control={control}
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
                </FieldRow>

                <FieldRow>
                    <FormField
                        control={control}
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
                        control={control}
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
            </div>

            <Separator />

            {/* ── Access ────────────────────────────────────────────────── */}
            <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Access
                </p>
                <FieldRow>
                    <FormField
                        control={control}
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

        </div>
    )
}