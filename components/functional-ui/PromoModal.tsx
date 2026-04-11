'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useForm } from "react-hook-form"

type CheckoutState = {
  subtotal: number
  discount: number
  total: number
}

interface PromoModalProps {
  setCheckout: (value: CheckoutState) => void
  setPromoCode: (code: string | null) => void
}

type PromoForm = {
  promoCode: string
}

export function PromoModal({ setCheckout, setPromoCode }: PromoModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PromoForm>()

  const [message, setMessage] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function onSubmit(data: PromoForm) {
    setMessage(null)

    try {
      const res = await fetch('/api/checkout', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promoCode: data.promoCode.trim(),
        }),
      })

      const body = await res.json()

      if (!res.ok) {
        setMessage(body.error || "Something went wrong")
        return
      }
      setPromoCode(data.promoCode.trim())
      // backend totals
      setCheckout({
        subtotal: body.totals.subtotal,
        discount: body.totals.discount,
        total: body.totals.total,
      })

      reset()
      setOpen(false)

    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Unknown error")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Apply Promo</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit(onSubmit)}>

          <DialogHeader>
            <DialogTitle>Apply Promo Code</DialogTitle>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <Label>Promo Code</Label>

              <Input
                placeholder="Enter your promo code..."
                maxLength={10}
                {...register("promoCode", {
                  required: "Promo code is required",
                  minLength: { value: 6, message: "Minimum 6 characters" },
                  maxLength: { value: 10, message: "Maximum 10 characters" },
                })}
              />

              {errors.promoCode && (
                <p className="text-sm text-red-500">
                  {errors.promoCode.message}
                </p>
              )}

              {message && (
                <p className="text-sm text-red-500 mt-2">
                  {message}
                </p>
              )}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Applying..." : "Apply"}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}