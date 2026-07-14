"use client";

import { MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import type { DataTableRowAction } from "@/components/ui/data-table/data-table-types";

export function DataTableRowActions<TData>({ actions, row }: { actions: DataTableRowAction<TData>[]; row: TData }) {
  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          className="opacity-45 transition group-hover:opacity-100 group-focus-within:opacity-100 data-[state=open]:opacity-100"
          label="Opções do registro"
          size="sm"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <div key={action.label}>
              {action.separatorBefore ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                danger={action.danger}
                disabled={action.disabled}
                onSelect={() => action.onSelect(row)}
              >
                {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
                {action.label}
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
