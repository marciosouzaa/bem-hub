import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type FeedbackVariant = "error" | "info" | "success" | "warning";

const styles: Record<FeedbackVariant, string> = {
  error: "border-danger/30 bg-danger/10 text-danger",
  info: "border-ai-blue/30 bg-ai-blue/10 text-ai-blue",
  success: "border-primary/30 bg-sidebar-active text-primary",
  warning: "border-warning/30 bg-warning/10 text-warning",
};

const icons = {
  error: XCircle,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
};

type FeedbackMessageProps = ComponentProps<"div"> & {
  children: ReactNode;
  title?: string;
  variant?: FeedbackVariant;
};

export function FeedbackMessage({
  children,
  className,
  title,
  variant = "info",
  ...props
}: FeedbackMessageProps) {
  const Icon = icons[variant];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-control)] border px-3 py-3 text-sm leading-6",
        styles[variant],
        className,
      )}
      role={variant === "error" ? "alert" : "status"}
      {...props}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
