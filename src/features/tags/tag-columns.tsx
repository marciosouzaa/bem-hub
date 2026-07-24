import { Tag as TagIcon } from "lucide-react";

import type { DataTableColumn } from "@/components/ui/data-table/data-table";
import type { Tag } from "@/features/tags/tag-schema";

export const tagColumns: DataTableColumn<Tag>[] = [
  {
    accessorKey: "name",
    header: "Etiqueta",
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-panel-border bg-panel-elevated"
        >
          <TagIcon className="size-4" style={{ color: row.original.hexColor }} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="mt-0.5 font-mono text-xs text-muted">
            {row.original.hexColor}
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: "Descrição",
    cell: ({ getValue }) => (
      <span className="block max-w-96 truncate text-muted-strong">
        {getValue<string | null>() || "Sem descrição"}
      </span>
    ),
    meta: { priority: "secondary" },
  },
  {
    accessorKey: "usageCount",
    header: "Uso",
    cell: ({ getValue }) => {
      const count = getValue<number>();
      return (
        <span className={count > 0 ? "text-foreground" : "text-muted"}>
          {count} {count === 1 ? "contato" : "contatos"}
        </span>
      );
    },
    meta: { align: "right" },
  },
  {
    accessorKey: "updatedAt",
    header: "Atualizada",
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-muted">
        {new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(getValue<string>()))}
      </span>
    ),
    meta: { align: "right", priority: "optional" },
  },
];
