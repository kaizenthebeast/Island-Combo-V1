'use client'

import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { customToast } from '@/shared/components/common/modals/ToastCustom'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { addCardSchema, type AddCardFormValues } from '@/features/account/validations/card'
import { addCard } from '@/features/account/api/cards'

// Brand from the leading digits (client-side only — used for display).
const detectBrand = (digits: string): string => {
  if (/^4/.test(digits)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard'
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^6(?:011|5)/.test(digits)) return 'discover'
  if (/^3(?:0[0-5]|[68])/.test(digits)) return 'diners'
  if (/^35/.test(digits)) return 'jcb'
  return 'card'
}

const AddCardSheet = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  const form = useForm<AddCardFormValues>({
    resolver: zodResolver(addCardSchema),
    defaultValues: { cardholder_name: '', card_number: '', expiry: '', cvv: '' },
  })

  const onSubmit: SubmitHandler<AddCardFormValues> = async (data) => {
    const digits = data.card_number.replace(/[\s-]/g, '')
    const exp = data.expiry.replace(/[^\d]/g, '')

    // SECURITY: only safe metadata leaves the browser. The full number and CVV
    // are intentionally NOT included in this payload — they are never sent or stored.
    const res = await addCard({
      cardholder_name: data.cardholder_name.trim(),
      brand: detectBrand(digits),
      last4: digits.slice(-4),
      exp_month: parseInt(exp.slice(0, 2), 10),
      exp_year: 2000 + parseInt(exp.slice(2, 4), 10),
    })

    if (!res.success) {
      customToast.error({ title: "Couldn't save card", description: res.message })
      return
    }

    setOpen(false)
    form.reset()
    customToast.success({
      title: 'Card saved',
      description: `${detectBrand(digits)} ending in ${digits.slice(-4)} was added.`,
    })
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={
          isMobile
            ? 'rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto'
            : 'w-full sm:w-[420px] p-5 overflow-y-auto'
        }
      >
        <SheetTitle className="text-lg font-semibold mb-5">Add New Card</SheetTitle>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cardholder_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name on card</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Smith" maxLength={80} autoComplete="cc-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="card_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card number</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="1234 5678 9012 3456"
                      maxLength={23}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" maxLength={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cvv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security code</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" autoComplete="cc-csc" placeholder="CVV" maxLength={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              For your security we never store your full card number or security code — only the
              brand, last 4 digits and expiry.
            </p>

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full bg-brand hover:bg-brand-hover rounded-full"
            >
              {form.formState.isSubmitting ? 'Saving…' : 'Add Card'}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

export default AddCardSheet
