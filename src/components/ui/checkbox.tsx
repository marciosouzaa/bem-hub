import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <input
      className={cn(
        "size-4 shrink-0 rounded border-panel-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      type="checkbox"
      {...props}
    />
  );
}
