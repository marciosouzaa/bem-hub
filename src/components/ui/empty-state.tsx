import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  action?: ReactNode;
  className?: string;
  description: string;
  icon: LucideIcon;
  title: string;
};

export function EmptyState({ action, className, description, icon: Icon, title }: EmptyStateProps) {
  return (
    <div className={cn("flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <span className="mb-4 flex size-11 items-center justify-center rounded-xl border border-primary/15 bg-sidebar-active text-primary">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
