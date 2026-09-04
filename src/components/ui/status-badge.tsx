import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeVariant = "danger" | "info" | "neutral" | "success" | "warning";

const styles: Record<StatusBadgeVariant, string> = {
  danger: "border-danger/30 bg-danger/10 text-danger",
  info: "border-ai-blue/30 bg-ai-blue/10 text-ai-blue",
  neutral: "border-panel-border bg-panel-elevated text-muted-strong",
  success: "border-primary/30 bg-sidebar-active text-primary",
  warning: "border-warning/30 bg-warning/10 text-warning",
};

export function StatusBadge({
  children,
  className,
  icon,
  variant = "neutral",
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  variant?: StatusBadgeVariant;
}) {
  return (
    <Badge className={cn("gap-1.5 normal-case tracking-normal", styles[variant], className)}>
      {icon}
      {children}
    </Badge>
  );
}
