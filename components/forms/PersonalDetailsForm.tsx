'use client'

import { useState } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  personalDetailsSchema,
  PersonalDetailsFormValues,
} from '@/form-schema/userSchema'
import { updateMyProfile } from '@/lib/users'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PersonalDetailsFormValues>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      first_name: firstName ?? '',
      last_name: lastName ?? '',
      phone_text: phone ?? '',
    },
  })

  const onSubmit: SubmitHandler<PersonalDetailsFormValues> = async (data) => {
    setSubmitError(null)
    const result = await updateMyProfile({
      first_name: data.first_name,
      last_name: data.last_name,
      phone_text: data.phone_text || undefined,
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
    reset({
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

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-5'>
          {email && (
            <div className='space-y-2'>
              <Label htmlFor='email'>Email address</Label>
              <Input
                id='email'
                value={email}
                readOnly
                className='bg-gray-100 cursor-not-allowed'
              />
              <p className='text-xs text-gray-500'>Email cannot be changed here.</p>
            </div>
          )}

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='first_name'>First name</Label>
              <Input
                id='first_name'
                placeholder='Jane'
                maxLength={15}
                {...register('first_name')}
                aria-invalid={errors.first_name ? 'true' : 'false'}
              />
              {errors.first_name && (
                <p className='text-sm text-red-500'>{errors.first_name.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='last_name'>Last name</Label>
              <Input
                id='last_name'
                placeholder='Smith'
                maxLength={15}
                {...register('last_name')}
                aria-invalid={errors.last_name ? 'true' : 'false'}
              />
              {errors.last_name && (
                <p className='text-sm text-red-500'>{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='phone_text'>Mobile number</Label>
            <Input
              id='phone_text'
              type='tel'
              placeholder='091234545454'
              maxLength={16}
              {...register('phone_text')}
              aria-invalid={errors.phone_text ? 'true' : 'false'}
            />
            {errors.phone_text && (
              <p className='text-sm text-red-500'>{errors.phone_text.message}</p>
            )}
          </div>

          {submitError && <p className='text-sm text-red-500'>{submitError}</p>}

          <Button
            type='submit'
            disabled={isSubmitting}
            className='w-full bg-[#900036] hover:bg-[#77002d] rounded-full'
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export default PersonalDetailsForm
