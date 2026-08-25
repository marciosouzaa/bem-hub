"use client";

import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuGroup = DropdownPrimitive.Group;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        className={cn(
          "z-[var(--layer-overlay)] min-w-44 overflow-hidden rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated p-1.5 text-foreground shadow-[var(--shadow-popover)] data-[state=closed]:animate-[menu-out_100ms_ease-in] data-[state=open]:animate-[menu-in_140ms_ease-out] motion-reduce:animate-none",
          className,
        )}
        sideOffset={sideOffset}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, danger = false, inset = false, ...props }: ComponentProps<typeof DropdownPrimitive.Item> & { danger?: boolean; inset?: boolean }) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        "relative flex min-h-9 cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-sidebar-active data-[highlighted]:text-primary",
        inset && "pl-8",
        danger && "text-danger data-[highlighted]:bg-danger/10 data-[highlighted]:text-danger",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, inset = false, ...props }: ComponentProps<typeof DropdownPrimitive.Label> & { inset?: boolean }) {
  return <DropdownPrimitive.Label className={cn("px-2.5 py-2 text-xs font-medium text-muted", inset && "pl-8", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Separator>) {
  return <DropdownPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-panel-border", className)} {...props} />;
}

export function DropdownMenuCheckboxItem({ children, className, checked, ...props }: ComponentProps<typeof DropdownPrimitive.CheckboxItem>) {
  return (
    <DropdownPrimitive.CheckboxItem
      checked={checked}
      className={cn("relative flex min-h-9 cursor-default select-none items-center rounded-lg py-2 pl-8 pr-2.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-sidebar-active data-[highlighted]:text-primary", className)}
      {...props}
    >
      <span className="absolute left-2.5 flex size-4 items-center justify-center">
        <DropdownPrimitive.ItemIndicator>
          <Check aria-hidden="true" className="size-4" />
        </DropdownPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownPrimitive.CheckboxItem>
  );
}

export function DropdownMenuSubTrigger({ children, className, inset = false, ...props }: ComponentProps<typeof DropdownPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <DropdownPrimitive.SubTrigger className={cn("flex min-h-9 cursor-default select-none items-center rounded-lg px-2.5 py-2 text-sm outline-none data-[state=open]:bg-sidebar-active data-[state=open]:text-primary data-[highlighted]:bg-sidebar-active data-[highlighted]:text-primary", inset && "pl-8", className)} {...props}>
      {children}
      <ChevronRight aria-hidden="true" className="ml-auto size-4" />
    </DropdownPrimitive.SubTrigger>
  );
}

export const DropdownMenuSub = DropdownPrimitive.Sub;

export function DropdownMenuSubContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof DropdownPrimitive.SubContent>) {
  return (
    <DropdownPrimitive.SubContent
      className={cn("z-[var(--layer-overlay)] min-w-44 overflow-hidden rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated p-1.5 text-foreground shadow-[var(--shadow-popover)]", className)}
      sideOffset={sideOffset}
      {...props}
    />
  );
}
