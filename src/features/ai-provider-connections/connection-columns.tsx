import { KeyRound, PlugZap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table/data-table";
import type { AiProviderConnectionListItem } from "@/features/ai-provider-connections/queries";
import { AI_PROVIDER_DEFINITIONS } from "@/lib/ai/providers";

const statusLabels: Record<AiProviderConnectionListItem["status"], string> = {
  active: "Ativa",
  disabled: "Desativada",
  needs_attention: "Requer atenção",
};

export const aiProviderConnectionColumns: DataTableColumn<AiProviderConnectionListItem>[] = [
  {
    accessorKey: "name",
    header: "Conexão",
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-active text-primary">
          <PlugZap aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-muted">
            <KeyRound aria-hidden="true" className="size-3" />
            {row.original.keyHint ?? "Chave protegida"}
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "provider",
    header: "Provedor",
    cell: ({ getValue }) => <Badge>{AI_PROVIDER_DEFINITIONS[getValue<AiProviderConnectionListItem["provider"]>()].label}</Badge>,
    meta: { priority: "secondary" },
  },
  {
    accessorKey: "defaultModel",
    header: "Modelo padrão",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-strong">{row.original.defaultModel ?? AI_PROVIDER_DEFINITIONS[row.original.provider].defaultModel}</span>,
    meta: { priority: "secondary" },
  },
  {
    id: "models",
    header: "Modelos",
    accessorFn: (connection) => connection.availableModels.length,
    cell: ({ getValue }) => <span className="text-muted">{getValue<number>()} disponíveis</span>,
    meta: { priority: "optional" },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <div className="text-right">
        <p className={row.original.status === "active" ? "text-success" : row.original.status === "needs_attention" ? "text-warning" : "text-muted"}>{statusLabels[row.original.status]}</p>
        {row.original.isDefault ? <p className="mt-0.5 text-xs text-primary">Padrão</p> : null}
      </div>
    ),
    meta: { align: "right" },
  },
];
