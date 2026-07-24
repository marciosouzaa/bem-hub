import { AlertTriangle, Radio, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table/data-table";
import type {
  Contact,
  ContactLifecycleStage,
} from "@/features/contacts/contact-schema";
import { formatContactPhone } from "@/features/contacts/phone-normalization";
import { getContactInitials } from "@/features/support/support-presenters";

export const contactStageLabels: Record<ContactLifecycleStage, string> = {
  customer: "Cliente",
  discarded: "Descartado",
  lead: "Lead",
  new: "Novo",
};

const stageClasses: Record<ContactLifecycleStage, string> = {
  customer: "border-primary/25 bg-sidebar-active text-primary",
  discarded: "border-panel-border bg-panel-elevated text-muted",
  lead: "border-ai-blue/25 bg-ai-blue/10 text-ai-blue",
  new: "border-warning/25 bg-warning/10 text-warning",
};

export const contactColumns: DataTableColumn<Contact>[] = [
  {
    accessorKey: "name",
    header: "Contato",
    cell: ({ row }) => {
      const contact = row.original;
      const phone = formatContactPhone(contact.phone, contact.phoneStatus);
      const displayName = contact.name?.trim() || phone;
      return (
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-panel-border bg-panel-elevated text-xs font-semibold text-muted-strong">
            {contact.name ? getContactInitials(contact.name) : <UserRound aria-hidden="true" className="size-4" />}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{displayName}</p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {contact.name ? phone : contact.email ?? "Nome ainda não informado"}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "lifecycleStage",
    header: "Estágio",
    cell: ({ getValue }) => {
      const stage = getValue<ContactLifecycleStage>();
      return <Badge className={stageClasses[stage]}>{contactStageLabels[stage]}</Badge>;
    },
    meta: { priority: "secondary" },
  },
  {
    accessorKey: "tags",
    header: "Etiquetas",
    cell: ({ row }) => row.original.tags.length > 0 ? (
      <div className="flex max-w-52 items-center gap-1.5 overflow-hidden">
        {row.original.tags.slice(0, 2).map((tag) => (
          <span
            className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-panel-border bg-panel-elevated px-2 py-1 text-xs text-muted-strong"
            key={tag.id}
          >
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: tag.hexColor }}
            />
            <span className="truncate">{tag.name}</span>
          </span>
        ))}
        {row.original.tags.length > 2 ? (
          <span className="text-xs text-muted">+{row.original.tags.length - 2}</span>
        ) : null}
      </div>
    ) : (
      <span className="text-muted">Sem etiquetas</span>
    ),
    meta: { priority: "optional" },
  },
  {
    accessorKey: "channelNames",
    header: "Origem",
    cell: ({ row }) => (
      <span className="inline-flex max-w-44 items-center gap-2 truncate text-muted-strong">
        <Radio aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
        {row.original.channelNames.join(", ") || "Cadastro manual"}
      </span>
    ),
    meta: { priority: "optional" },
  },
  {
    accessorKey: "phoneStatus",
    header: "Identidade",
    cell: ({ row }) => row.original.phoneStatus === "unsupported_country" ? (
      <span className="inline-flex items-center gap-1.5 text-warning">
        <AlertTriangle aria-hidden="true" className="size-3.5" />
        DDI não suportado
      </span>
    ) : row.original.phoneStatus === "supported" ? (
      <span className="text-muted-strong">Brasil validado</span>
    ) : (
      <span className="text-muted">
        {row.original.phone ? "Telefone não validado" : "Sem telefone"}
      </span>
    ),
    meta: { priority: "optional" },
  },
  {
    accessorKey: "lastContactAt",
    header: "Última atividade",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted">
        {row.original.lastContactAt
          ? new Intl.DateTimeFormat("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(new Date(row.original.lastContactAt))
          : "Sem atendimento"}
      </span>
    ),
    meta: { align: "right" },
  },
];
