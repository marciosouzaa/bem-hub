"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DataTableControlBarProps = {
  actions?: ReactNode;
  className?: string;
  onSearchChange: (value: string) => void;
  resultLabel?: string;
  searchPlaceholder?: string;
  searchValue: string;
};

export function DataTableControlBar({
  actions,
  className,
  onSearchChange,
  resultLabel,
  searchPlaceholder = "Buscar...",
  searchValue,
}: DataTableControlBarProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            aria-label={searchPlaceholder}
            className="pl-9 pr-9"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            type="search"
            value={searchValue}
          />
          {searchValue ? (
            <IconButton
              className="absolute right-1 top-1 size-8"
              label="Limpar busca"
              onClick={() => onSearchChange("")}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </IconButton>
          ) : null}
        </div>
        {resultLabel ? <span className="hidden whitespace-nowrap text-xs text-muted md:inline">{resultLabel}</span> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
