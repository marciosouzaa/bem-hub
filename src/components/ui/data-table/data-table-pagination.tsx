"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DataTablePaginationState } from "@/components/ui/data-table/data-table-types";

export function DataTablePagination({
  onPageChange,
  pageCount,
  pageIndex,
  pageSize,
  totalCount,
}: DataTablePaginationState) {
  const currentPage = pageIndex + 1;
  const countLabel = totalCount === undefined ? null : `${totalCount} ${totalCount === 1 ? "registro" : "registros"}`;

  return (
    <div className="flex flex-col gap-3 border-t border-panel-border px-4 py-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
      <span>
        {countLabel ?? `Até ${pageSize} registros por página`}
      </span>
      <div className="flex items-center gap-3">
        <span>
          Página {currentPage} de {Math.max(pageCount, 1)}
        </span>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Página anterior"
            className="size-8"
            disabled={pageIndex <= 0}
            onClick={() => onPageChange(pageIndex - 1)}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label="Próxima página"
            className="size-8"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => onPageChange(pageIndex + 1)}
            size="icon"
            variant="ghost"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
