
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const promoCodeSchema = z.object({
  promoCode: z.string().min(3, "Promo code must be at least 3 characters"),
});

type PromoCodeForm = z.infer<typeof promoCodeSchema>;

interface PromoCodeModalProps {
  children: React.ReactElement
  totalQty: number,
  subtotal: number,
  setDiscount: React.Dispatch<React.SetStateAction<number>>;
  setIsFinalTotal: React.Dispatch<React.SetStateAction<number>>;

}

export const PromoCodeModal: React.FC<PromoCodeModalProps> = ({ setDiscount, setIsFinalTotal, totalQty, subtotal, children }) => {
  const [open, setOpen] = React.useState(false);
  const [isErrorMessage, setIsErrorMessage] = React.useState('');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PromoCodeForm>({
    resolver: zodResolver(promoCodeSchema),
  });

  const promoCodeValue = watch("promoCode") || "";
  const isValid = promoCodeValue.length >= 3;

  const onSubmit = async (data: PromoCodeForm) => {
    setIsErrorMessage("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promoCode: data.promoCode,
          quantity: totalQty,
          subtotal,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.error ?? "Failed to apply promo code");
      }

      setIsFinalTotal(body.finalTotal);
      setDiscount(body.discount);

      reset();
      setOpen(false); 
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error";

      setIsErrorMessage(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enter Your Promo Code</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
          <Input
            placeholder="Promo code"
            {...register("promoCode")}
            maxLength={20}
          />

          {(errors.promoCode || isErrorMessage) && (
            <p className="text-red-500 text-sm">
              {errors.promoCode?.message || isErrorMessage}
            </p>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={!isValid}
              className={`${isValid ? "cursor-pointer bg-blue-600 hover:bg-blue-700" : "cursor-not-allowed bg-gray-400"}`}
            >
              Apply
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};