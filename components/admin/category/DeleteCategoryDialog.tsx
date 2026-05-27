import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Archive, AlertTriangle } from "lucide-react";

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  categoryId: string | number;
  onConfirm: () => void | Promise<void>;
}

const DeleteCategoryDialog = ({
  open,
  onOpenChange,
  categoryName,
  onConfirm,
}: DeleteCategoryDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Error handled by parent via deleteError banner in CategoryClient
      console.error("Failed to archive category:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (!isDeleting) onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-tint">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>

            <div className="flex flex-col gap-1">
              <DialogTitle className="text-base leading-snug">
                Archive category?
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  "{categoryName}"
                </span>{" "}
                will be archived and hidden from your storefront. Any products
                linked to this category will be unaffected and it can be
                restored at any time.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="flex gap-3 mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="gap-2 bg-warning hover:bg-warning text-white"
          >
            {isDeleting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Archiving…
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                Archive category
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteCategoryDialog;