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
  children: React.ReactElement; 
}

export const PromoCodeModal: React.FC<PromoCodeModalProps> = ({ children }) => {
  const [open, setOpen] = React.useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PromoCodeForm>({
    resolver: zodResolver(promoCodeSchema),
  });

  const promoCodeValue = watch("promoCode") || "";
  const isValid = promoCodeValue.length >= 3; // matches Zod min length

  const onSubmit = async (data: PromoCodeForm) => {
    try {
      // Example API call to apply promo code
      const res = await fetch("/api/apply-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoCode: data.promoCode }),
      });
      const result = await res.json();

      if (result.success) {
        alert(`Promo applied! New total: $${result.newTotal}`);
        // Optional: update cart store if you use Zustand/Redux
      } else {
        alert(`Promo code invalid: ${result.message}`);
      }

      reset();
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
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
            maxLength={8}
          />

          {errors.promoCode && (
            <p className="text-red-500 text-sm">{errors.promoCode.message}</p>
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