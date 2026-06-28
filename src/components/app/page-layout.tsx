import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageLayoutProps = HTMLAttributes<HTMLDivElement> & {
  size?: "standard" | "wide" | "full";
};

const pageLayoutSizes = {
  standard: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

export function PageLayout({
  className,
  size = "standard",
  ...props
}: PageLayoutProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 pb-12 pt-8 md:px-8 md:pt-10 lg:pt-12",
        pageLayoutSizes[size],
        className,
      )}
      {...props}
    />
  );
}

type PageHeaderProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  title,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex min-w-0 flex-col gap-5 md:flex-row md:items-start md:justify-between",
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-3xl font-semibold leading-tight tracking-normal text-foreground md:text-[40px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-strong md:text-lg md:leading-8">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
