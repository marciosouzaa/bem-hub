import { KeyRound, QrCode, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table/data-table";
import type { ChannelConnection } from "@/features/channels/channel-schema";

const statusLabels: Record<ChannelConnection["status"], string> = {
  active: "Ativo",
  disabled: "Desativado",
  failed: "Com falha",
  pending: "Configuração pendente",
};

export const channelColumns: DataTableColumn<ChannelConnection>[] = [
  {
    accessorKey: "name",
    header: "Canal",
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-active text-primary">
          <Smartphone aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{row.original.phoneNumber}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "kind",
    header: "Modalidade",
    cell: ({ getValue }) => {
      const kind = getValue<ChannelConnection["kind"]>();
      return (
        <Badge className={kind === "unofficial" ? "border-ai-blue/25 bg-ai-blue/10 text-ai-blue" : undefined}>
          {kind === "official" ? "Oficial" : "Não oficial"}
        </Badge>
      );
    },
    meta: { priority: "secondary" },
  },
  {
    accessorKey: "authMethod",
    header: "Autenticação",
    cell: ({ getValue }) => {
      const method = getValue<ChannelConnection["authMethod"]>();
      const Icon = method === "qr" ? QrCode : KeyRound;
      return (
        <span className="inline-flex items-center gap-2 text-muted-strong">
          <Icon aria-hidden="true" className="size-4 text-muted" />
          {method === "qr" ? "QR Code" : "PIN Code"}
        </span>
      );
    },
    meta: { priority: "secondary" },
  },
  {
    accessorKey: "provider",
    header: "Provedor",
    cell: ({ getValue }) => (
      <span className="text-muted">
        {getValue<string>() === "pending-selection" ? "A definir" : getValue<string>()}
      </span>
    ),
    meta: { priority: "optional" },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ getValue }) => {
      const status = getValue<ChannelConnection["status"]>();
      return (
        <span className={status === "failed" ? "text-danger" : status === "active" ? "text-success" : "text-muted"}>
          {statusLabels[status]}
        </span>
      );
    },
    meta: { align: "right" },
  },
];
