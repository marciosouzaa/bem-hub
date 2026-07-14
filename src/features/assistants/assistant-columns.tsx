import { Bot, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table/data-table";
import type { AssistantListItem } from "@/features/assistants/queries";
import { AI_PROVIDER_DEFINITIONS } from "@/lib/ai/providers";

export const assistantColumns: DataTableColumn<AssistantListItem>[] = [
  {
    accessorKey: "name",
    header: "Assistente",
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-active text-primary">
          <Bot aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="mt-0.5 max-w-md truncate text-xs text-muted">
            {row.original.description || "Sem descrição cadastrada"}
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "area",
    header: "Área",
    cell: ({ getValue }) => <span className="text-muted-strong">{getValue<string | null>() || "Geral"}</span>,
    meta: { priority: "secondary" },
  },
  {
    accessorKey: "provider",
    header: "Modelo",
    cell: ({ row }) => (
      <div>
        <p className="text-muted-strong">{AI_PROVIDER_DEFINITIONS[row.original.provider].label}</p>
        <p className="mt-0.5 font-mono text-xs text-muted">{row.original.model}</p>
      </div>
    ),
    meta: { priority: "secondary" },
  },
  {
    accessorKey: "temperature",
    header: "Temperatura",
    cell: ({ getValue }) => (
      <span className="inline-flex items-center gap-2 text-muted">
        <SlidersHorizontal aria-hidden="true" className="size-3.5" />
        {getValue<number>().toFixed(1)}
      </span>
    ),
    meta: { priority: "optional" },
  },
  {
    accessorKey: "isDefault",
    header: "Estado",
    cell: ({ getValue }) => getValue<boolean>() ? <Badge>Padrão</Badge> : <span className="text-muted">Disponível</span>,
    meta: { align: "right" },
  },
];
