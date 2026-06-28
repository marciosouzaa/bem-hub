import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ContextPanelProps = HTMLAttributes<HTMLElement> & {
  sticky?: boolean;
};

export function ContextPanel({
  className,
  sticky = false,
  ...props
}: ContextPanelProps) {
  return (
    <aside
      className={cn(
        "min-w-0 space-y-6",
        sticky && "lg:sticky lg:top-24",
        className,
      )}
      {...props}
    />
  );
}
