import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DetailListItem = {
  label: ReactNode;
  value: ReactNode;
};

export function DetailList({
  className,
  items,
}: {
  className?: string;
  items: DetailListItem[];
}) {
  return (
    <dl className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {items.map((item, index) => (
        <div
          className="min-w-0 rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 py-3"
          key={`${index}-${String(item.label)}`}
        >
          <dt className="text-xs uppercase tracking-[0.08em] text-muted">{item.label}</dt>
          <dd className="mt-2 truncate text-sm font-medium text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
