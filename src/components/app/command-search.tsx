import { Search } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CommandSearchProps = ComponentPropsWithoutRef<"input"> & {
  containerClassName?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function CommandSearch({
  className,
  containerClassName,
  leading,
  placeholder = "Buscar no sistema operacional...",
  trailing,
  type = "search",
  ...props
}: CommandSearchProps) {
  return (
    <div className={cn("relative min-w-0 flex-1", containerClassName)}>
      <div className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center text-muted">
        {leading ?? <Search className="size-4" />}
      </div>
      <input
        className={cn(
          "h-10 w-full rounded-[16px] border border-panel-border bg-panel px-11 text-sm text-foreground shadow-[var(--shadow-card)] outline-none transition placeholder:text-muted focus:border-primary focus:shadow-[var(--shadow-focus)]",
          trailing && "pr-12",
          className,
        )}
        placeholder={placeholder}
        type={type}
        {...props}
      />
      {trailing ? (
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
