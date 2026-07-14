import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormSectionProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
};

export function FormSection({ children, className, description, title }: FormSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {title || description ? (
        <header className="space-y-1">
          {title ? <h3 className="text-sm font-semibold text-foreground">{title}</h3> : null}
          {description ? <p className="text-xs leading-5 text-muted">{description}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
