"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from "lucide-react";
import { useState } from "react";

import { DataTablePagination } from "@/components/ui/data-table/data-table-pagination";
import { DataTableRowActions } from "@/components/ui/data-table/data-table-row-actions";
import type {
  DataTableColumn,
  DataTablePaginationState,
  DataTableRowAction,
  DataTableRowSignal,
} from "@/components/ui/data-table/data-table-types";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DataTableProps<TData extends object> = {
  columns: DataTableColumn<TData>[];
  data: TData[];
  emptyAction?: React.ReactNode;
  emptyDescription?: string;
  emptyTitle?: string;
  error?: string;
  getRowId: (row: TData) => string;
  getRowSignal?: (row: TData) => DataTableRowSignal;
  loading?: boolean;
  onRetry?: () => void;
  onRowClick?: (row: TData) => void;
  pagination?: DataTablePaginationState;
  rowActions?: (row: TData) => DataTableRowAction<TData>[];
};

const priorityClasses = {
  primary: "",
  secondary: "hidden md:table-cell",
  optional: "hidden lg:table-cell",
};

const signalClasses: Record<DataTableRowSignal, string> = {
  danger: "bg-danger",
  neutral: "bg-transparent",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
};

export function DataTable<TData extends object>({
  columns,
  data,
  emptyAction,
  emptyDescription = "Quando houver dados, eles aparecerão aqui.",
  emptyTitle = "Nenhum registro encontrado",
  error,
  getRowId,
  getRowSignal = () => "neutral",
  loading = false,
  onRetry,
  onRowClick,
  pagination,
  rowActions,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  // TanStack Table exposes mutable callbacks by design; React Compiler skips this hook safely.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-panel-border bg-panel shadow-[var(--shadow-card)]">
      {error ? (
        <ErrorState description={error} onRetry={onRetry} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-panel-subtle text-xs text-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta;
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                        className={cn(
                          "h-11 whitespace-nowrap border-b border-panel-border px-4 font-medium",
                          meta?.align === "center" && "text-center",
                          meta?.align === "right" && "text-right",
                          priorityClasses[meta?.priority ?? "primary"],
                          meta?.className,
                        )}
                        key={header.id}
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md py-1 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                              meta?.align === "right" && "ml-auto",
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                            type="button"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === "asc" ? (
                              <ArrowUp aria-hidden="true" className="size-3.5 text-primary" />
                            ) : sorted === "desc" ? (
                              <ArrowDown aria-hidden="true" className="size-3.5 text-primary" />
                            ) : (
                              <ArrowUpDown aria-hidden="true" className="size-3.5 opacity-55" />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                  {rowActions ? <th aria-label="Ações" className="w-12 border-b border-panel-border px-2" /> : null}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }, (_, index) => (
                    <tr className="h-[54px] border-b border-panel-border/70 last:border-b-0" key={index}>
                      {columns.map((_, columnIndex) => (
                        <td className="px-4" key={columnIndex}>
                          <Skeleton className={cn("h-3.5", columnIndex === 0 ? "w-40" : "w-24")} />
                        </td>
                      ))}
                      {rowActions ? <td className="px-2"><Skeleton className="size-8" /></td> : null}
                    </tr>
                  ))
                : table.getRowModel().rows.map((row) => {
                    const signal = getRowSignal(row.original);
                    return (
                      <tr
                        className={cn(
                          "group h-[54px] border-b border-panel-border/70 transition last:border-b-0 hover:bg-panel-elevated/55",
                          onRowClick && "cursor-pointer focus-within:bg-panel-elevated/55",
                        )}
                        key={row.id}
                        onClick={() => onRowClick?.(row.original)}
                        onKeyDown={(event) => {
                          if (!onRowClick || (event.key !== "Enter" && event.key !== " ")) return;
                          event.preventDefault();
                          onRowClick(row.original);
                        }}
                        tabIndex={onRowClick ? 0 : undefined}
                      >
                        {row.getVisibleCells().map((cell, index) => {
                          const meta = cell.column.columnDef.meta;
                          return (
                            <td
                              className={cn(
                                "relative px-4 py-2.5 text-foreground",
                                meta?.align === "center" && "text-center",
                                meta?.align === "right" && "text-right",
                                priorityClasses[meta?.priority ?? "primary"],
                                meta?.className,
                              )}
                              key={cell.id}
                            >
                              {index === 0 ? (
                                <span aria-hidden="true" className={cn("absolute inset-y-2 left-0 w-0.5 rounded-r", signalClasses[signal])} />
                              ) : null}
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                        {rowActions ? (
                          <td className="w-12 px-2 text-right" onClick={(event) => event.stopPropagation()}>
                            <DataTableRowActions actions={rowActions(row.original)} row={row.original} />
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loading && data.length === 0 ? (
            <EmptyState action={emptyAction} description={emptyDescription} icon={Inbox} title={emptyTitle} />
          ) : null}
        </div>
      )}
      {!error && !loading && pagination ? <DataTablePagination {...pagination} /> : null}
    </div>
  );
}

export type { DataTableColumn, DataTableRowAction, DataTableRowSignal } from "@/components/ui/data-table/data-table-types";
