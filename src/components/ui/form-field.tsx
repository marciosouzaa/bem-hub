import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormFieldProps = {
  children: ReactNode;
  description?: ReactNode;
  error?: string;
  htmlFor?: string;
  label: ReactNode;
  optional?: boolean;
  className?: string;
};

export function FormField({
  children,
  className,
  description,
  error,
  htmlFor,
  label,
  optional = false,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium text-foreground" htmlFor={htmlFor}>
          {label}
        </label>
        {optional ? <span className="text-xs text-muted">Opcional</span> : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : description ? (
        <p className="text-xs leading-5 text-muted">{description}</p>
      ) : null}
    </div>
  );
}
