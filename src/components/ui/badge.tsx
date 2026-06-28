import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[8px] border border-primary/25 bg-sidebar-active px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary",
        className,
      )}
      {...props}
    />
  );
}
