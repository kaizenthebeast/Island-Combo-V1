'use client'

import { useState } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  personalDetailsSchema,
  PersonalDetailsFormValues,
} from '@/form-schema/userSchema'
import { updateMyAccount } from '@/lib/users'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { customToast } from '@/components/popup/ToastCustom'

type Props = {
  children: React.ReactNode
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  email?: string | null
  onSuccess?: () => void
}

const PersonalDetailsForm = ({
  children,
  firstName,
  lastName,
  phone,
  email,
  onSuccess,
}: Props) => {
  const [open, setOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<PersonalDetailsFormValues>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      first_name: firstName ?? '',
      last_name: lastName ?? '',
      phone_text: phone ?? '',
    },
  })

  const onSubmit: SubmitHandler<PersonalDetailsFormValues> = async (data) => {
    setSubmitError(null)
    const result = await updateMyAccount({
      first_name: data.first_name,
      last_name: data.last_name,
      phone_text: data.phone_text || null,
    })

    if (!result.success) {
      setSubmitError(result.message)
      customToast.error({
        title: 'Failed to update profile',
        description: result.message,
      })
      return
    }

    setOpen(false)
    form.reset({
      first_name: data.first_name,
      last_name: data.last_name,
      phone_text: data.phone_text ?? '',
    })
    customToast.success({
      title: 'Profile updated',
      description: 'Your personal details have been saved.',
    })
    onSuccess?.()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent
        side='right'
        className='w-full sm:w-[420px] h-screen overflow-y-auto bg-white p-5'
      >
        <SheetTitle className='text-lg font-semibold mb-6'>Edit personal details</SheetTitle>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
            {email && (
              <div className='space-y-2'>
                <Label htmlFor='email'>Email address</Label>
                <Input
                  id='email'
                  value={email}
                  readOnly
                  className='bg-muted cursor-not-allowed'
                />
                <p className='text-xs text-muted-foreground'>Email cannot be changed here.</p>
              </div>
            )}

            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='first_name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input placeholder='Jane' maxLength={15} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='last_name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input placeholder='Smith' maxLength={15} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='phone_text'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile number</FormLabel>
                  <FormControl>
                    <Input
                      type='tel'
                      placeholder='091234545454'
                      maxLength={16}
                      autoComplete='tel'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError && <p className='text-sm text-danger'>{submitError}</p>}

            <Button
              type='submit'
              disabled={form.formState.isSubmitting}
              className='w-full bg-brand hover:bg-brand-hover rounded-full cursor-pointer'
            >
              {form.formState.isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

export default PersonalDetailsForm
