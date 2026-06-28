import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  marker?: boolean;
};

export function SectionHeader({
  actions,
  className,
  description,
  marker = false,
  title,
  ...props
}: SectionHeaderProps) {
  return (
    <header
      className={cn(
        "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 gap-4">
        {marker ? (
          <span className="mt-1 h-9 w-1 shrink-0 rounded-full bg-primary" />
        ) : null}
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight text-foreground md:text-2xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-muted-strong">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
