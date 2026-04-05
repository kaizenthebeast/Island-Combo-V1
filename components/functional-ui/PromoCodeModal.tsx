// PromoCodeModal.tsx
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
  onApply: (code: string) => void;
}

export const PromoCodeModal: React.FC<PromoCodeModalProps & { children: React.ReactNode }> = ({
  onApply,
  children,
}) => {
  const [open, setOpen] = React.useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PromoCodeForm>({
    resolver: zodResolver(promoCodeSchema),
  });

  const onSubmit = (data: PromoCodeForm) => {
    onApply(data.promoCode);
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children} {/* your button becomes the trigger */}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enter Your Promo Code</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
          <Input placeholder="Promo code" {...register("promoCode")} />
          {errors.promoCode && <p className="text-red-500 text-sm">{errors.promoCode.message}</p>}
          <DialogFooter>
            <Button type="submit">Apply</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};