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

interface PromoModalProps {
  setDiscount: (value: number) => void
  setFinalTotal: (value: number) => void
  subtotal: number
  totalQty: number
}

type PromoForm = {
  promoCode: string
}

export function PromoModal({
  setDiscount,
  setFinalTotal,
  subtotal,
  totalQty
}: PromoModalProps) {

  const { register, handleSubmit, reset, formState: { errors, isSubmitting }
  } = useForm<PromoForm>()

  const [message, setMessage] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function onSubmit(data: PromoForm) {
    setMessage(null)

    try {
      const res = await fetch('/api/checkout', {
        method: "POST",
        headers: { "Content-Type": 'application/json' },
        body: JSON.stringify({
          promoCode: data.promoCode.trim(),
          totalQty,
          subtotal
        })
      })

      const body = await res.json()

      if (!res.ok) {
        setMessage(body.error || body.message || "Something went wrong")
        return
      }


      setDiscount(body.discount)
      setFinalTotal(body.finalTotal)

      reset()
      setOpen(false)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setMessage(msg)
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
                placeholder="Enter your promo code..." maxLength={10}
                {...register("promoCode", {
                  required: "Promo code is required",
                  minLength: {
                    value: 6,
                    message: "Minimum 6 characters"
                  },
                  maxLength: {
                    value: 10,
                    message: "Maximum 10 characters"
                  }
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
              {isSubmitting ? 'Applying' : 'Apply'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}