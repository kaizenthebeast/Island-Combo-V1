'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Trash2, AlertTriangle } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Title of the banner/ad being deleted (shown in the copy). */
  itemTitle: string
  kindLabel: 'banner' | 'promotion ad'
  onConfirm: () => Promise<void>
}

/** Confirm dialog for deleting a hero banner or promotion ad. Deletion is
 *  permanent and also removes the stored image from the bucket. */
export function DeletePromoContentDialog({ open, onOpenChange, itemTitle, kindLabel, onConfirm }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      // Error surfaced by the parent via its actionError banner
      console.error(`Failed to delete ${kindLabel}:`, error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!isDeleting) onOpenChange(value) }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-tint">
              <AlertTriangle className="h-5 w-5 text-danger" />
            </div>

            <div className="flex flex-col gap-1">
              <DialogTitle className="text-base leading-snug">
                Delete {kindLabel}?
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">&quot;{itemTitle}&quot;</span>{' '}
                and its image will be permanently deleted. This cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="flex gap-3 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="gap-2 bg-danger hover:bg-danger text-white"
          >
            {isDeleting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete {kindLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
