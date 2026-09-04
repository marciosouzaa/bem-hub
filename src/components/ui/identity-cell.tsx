import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function IdentityCell({
  className,
  description,
  title,
  visual,
}: {
  className?: string;
  description?: ReactNode;
  title: ReactNode;
  visual: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-sidebar-active text-primary">
        {visual}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mt-0.5 truncate text-xs leading-5 text-muted-strong">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
