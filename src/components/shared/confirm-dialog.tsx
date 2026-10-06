'use client';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean; onConfirm: () => void }) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="modal-content confirm-dialog">
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction className={destructive ? 'btn-destructive' : ''} onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
