import { ShieldCheck, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table/data-table";
import type { OrganizationMemberItem } from "@/features/members/queries";

export const memberColumns: DataTableColumn<OrganizationMemberItem>[] = [
  {
    accessorKey: "name",
    cell: ({ row }) => {
      const member = row.original;
      const Icon = member.isOwner ? ShieldCheck : UserRound;
      return (
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-sidebar-active text-primary">
            <Icon aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{member.name}</span>
            <span className="block truncate text-xs text-muted">{member.email}</span>
          </span>
        </div>
      );
    },
    header: "Usuario",
    meta: { priority: "primary" },
  },
  {
    accessorKey: "role",
    cell: ({ getValue }) => getRoleLabel(getValue<OrganizationMemberItem["role"]>()),
    header: "Papel",
    meta: { priority: "secondary" },
  },
  {
    accessorKey: "status",
    cell: ({ getValue }) => {
      const status = getValue<OrganizationMemberItem["status"]>();
      return (
        <Badge className={getStatusClassName(status)}>
          {getStatusLabel(status)}
        </Badge>
      );
    },
    header: "Status",
    meta: { priority: "secondary" },
  },
  {
    accessorKey: "invitedAt",
    cell: ({ row }) => getMembershipDate(row.original),
    header: "Acesso",
    meta: { priority: "optional" },
  },
];

export function getRoleLabel(role: OrganizationMemberItem["role"]) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Membro";
}

export function getStatusLabel(status: OrganizationMemberItem["status"]) {
  if (status === "active") return "Ativo";
  if (status === "invited") return "Convidado";
  return "Removido";
}

function getStatusClassName(status: OrganizationMemberItem["status"]) {
  if (status === "active") {
    return "border-primary/25 bg-sidebar-active text-primary";
  }
  if (status === "invited") {
    return "border-warning/25 bg-warning/10 text-warning";
  }
  return "border-panel-border bg-panel-subtle text-muted";
}

function getMembershipDate(member: OrganizationMemberItem) {
  const value = member.acceptedAt ?? member.invitedAt ?? member.createdAt;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
