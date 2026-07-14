"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

type ConfirmDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  onConfirm: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
  variant?: "primary" | "danger";
};

export function ConfirmDialog({
  cancelLabel = "Cancelar",
  confirmLabel = "Confirmar",
  description,
  onConfirm,
  onOpenChange,
  open,
  title,
  variant = "primary",
}: ConfirmDialogProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleConfirm() {
    setIsPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)} open={open}>
      <DialogContent showClose={false}>
        <DialogHeader className="pr-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogBody className="sr-only">Confirme a ação para continuar.</DialogBody>
        <DialogFooter>
          <Button disabled={isPending} onClick={() => onOpenChange(false)} variant="ghost">
            {cancelLabel}
          </Button>
          <Button disabled={isPending} onClick={handleConfirm} variant={variant}>
            {isPending ? <Spinner /> : null}
            {isPending ? "Processando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
