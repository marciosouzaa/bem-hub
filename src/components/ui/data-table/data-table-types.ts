import type { ColumnDef, RowData } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";

declare module "@tanstack/react-table" {
  // Generic parameters are required by TanStack's declaration-merging contract.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "center" | "right";
    className?: string;
    priority?: "primary" | "secondary" | "optional";
  }
}

export type DataTableColumn<TData> = ColumnDef<TData, unknown>;

export type DataTableRowAction<TData> = {
  danger?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  label: string;
  onSelect: (row: TData) => void;
  separatorBefore?: boolean;
};

export type DataTablePaginationState = {
  onPageChange: (pageIndex: number) => void;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  totalCount?: number;
};

export type DataTableRowSignal = "neutral" | "primary" | "success" | "warning" | "danger";
