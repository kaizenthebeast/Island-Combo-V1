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
  promoCode: z.string().nonempty("This is required"),
});

type PromoCodeForm = z.infer<typeof promoCodeSchema>;

interface PromoCodeModalProps {
  onApply: (code: string) => void;
  children: React.ReactElement; 
}

export const PromoCodeModal: React.FC<PromoCodeModalProps> = ({ onApply, children }) => {
  const [open, setOpen] = React.useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PromoCodeForm>({
    resolver: zodResolver(promoCodeSchema),
  });

  const promoCodeValue = watch("promoCode");

  const onSubmit = (data: PromoCodeForm) => {
    onApply(data.promoCode);
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enter Your Promo Code</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
          <Input placeholder="Promo code" {...register("promoCode")} required max={8}/>
          {errors.promoCode && <p className="text-red-500 text-sm">{errors.promoCode.message}</p>}
          <DialogFooter>
            <Button type="submit" disabled={!promoCodeValue} className={`${promoCodeValue ? 'cursor-pointer' : 'cursor-default'}`}>Apply</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};