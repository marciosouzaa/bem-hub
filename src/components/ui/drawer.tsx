"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

const widths = {
  sm: "sm:max-w-[420px]",
  md: "sm:max-w-[560px]",
  lg: "sm:max-w-[720px]",
};

export function DrawerContent({
  children,
  className,
  showClose = true,
  size = "md",
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  showClose?: boolean;
  size?: keyof typeof widths;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--layer-modal)] bg-black/60 backdrop-blur-[2px] data-[state=closed]:animate-[overlay-out_160ms_ease-in] data-[state=open]:animate-[overlay-in_180ms_ease-out] motion-reduce:animate-none" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 right-0 z-[var(--layer-modal)] flex h-dvh w-full flex-col border-l border-panel-border bg-panel shadow-[var(--shadow-popover)] data-[state=closed]:animate-[drawer-out_180ms_ease-in] data-[state=open]:animate-[drawer-in_240ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none",
          widths[size],
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close asChild>
            <IconButton className="absolute right-4 top-4" label="Fechar painel" size="sm" variant="ghost">
              <X aria-hidden="true" className="size-4" />
            </IconButton>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DrawerHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("shrink-0 space-y-2 border-b border-panel-border px-5 py-5 pr-14 sm:px-6", className)} {...props} />;
}

export function DrawerTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("text-lg font-semibold tracking-tight text-foreground", className)} {...props} />;
}

export function DrawerDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm leading-6 text-muted", className)} {...props} />;
}

export function DrawerBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6", className)} {...props} />;
}

export function DrawerFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex shrink-0 justify-end gap-3 border-t border-panel-border bg-panel px-5 py-4 sm:px-6", className)} {...props} />;
}
