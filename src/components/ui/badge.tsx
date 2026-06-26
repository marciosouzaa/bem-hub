import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-[#265b45] bg-[#123327] px-2.5 py-1 text-xs font-medium uppercase tracking-[0.08em] text-primary",
        className,
      )}
      {...props}
    />
  );
}
