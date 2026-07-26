"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";

type EntityDrawerProps = {
  children: ReactNode;
  description: string;
  formId: string;
  isDirty: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  open: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
  size?: "sm" | "md" | "lg";
  submittingLabel?: string;
  title: string;
};

export function EntityDrawer({
  children,
  description,
  formId,
  isDirty,
  isSubmitting = false,
  onClose,
  open,
  saveDisabled = false,
  saveLabel = "Salvar",
  size = "md",
  submittingLabel = "Salvando...",
  title,
}: EntityDrawerProps) {
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);

  function requestClose() {
    if (isSubmitting) return;
    if (isDirty) {
      setShowDiscardConfirmation(true);
      return;
    }
    onClose();
  }

  return (
    <>
      <Drawer onOpenChange={(nextOpen) => !nextOpen && requestClose()} open={open}>
        <DrawerContent onEscapeKeyDown={(event) => isSubmitting && event.preventDefault()} showClose={false} size={size}>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
            <IconButton
              className="absolute right-4 top-4"
              disabled={isSubmitting}
              label="Fechar painel"
              onClick={requestClose}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </IconButton>
          </DrawerHeader>
          <DrawerBody>{children}</DrawerBody>
          <DrawerFooter>
            <Button disabled={isSubmitting} onClick={requestClose} type="button" variant="ghost">
              Cancelar
            </Button>
            <Button
              disabled={isSubmitting || saveDisabled}
              form={formId}
              type="submit"
            >
              {isSubmitting ? <Spinner /> : null}
              {isSubmitting ? submittingLabel : saveLabel}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <ConfirmDialog
        confirmLabel="Descartar alterações"
        description="As informações preenchidas não foram salvas. Esta ação não pode ser desfeita."
        onConfirm={onClose}
        onOpenChange={setShowDiscardConfirmation}
        open={showDiscardConfirmation}
        title="Descartar alterações?"
        variant="danger"
      />
    </>
  );
}
