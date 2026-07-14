import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full resize-y rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 py-2.5 text-sm text-foreground transition placeholder:text-muted focus:border-primary/55 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-danger aria-invalid:ring-danger/15",
        className,
      )}
      {...props}
    />
  );
}
