"use client";

import { ArrowRightLeft, Building2, Check, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table/data-table";
import { useFeedbackToast } from "@/components/ui/feedback-toast";
import {
  switchLinkedEnvironmentAction,
  unlinkLinkedEnvironmentAction,
} from "@/features/organizations/workspace-actions";
import {
  canUnlinkLinkedEnvironment,
  type LinkedEnvironment,
} from "@/features/organizations/linked-environments";

const columns: DataTableColumn<LinkedEnvironment>[] = [
  {
    accessorKey: "name",
    cell: ({ row }) => {
      const environment = row.original;

      return (
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-sidebar-active text-primary">
            <Building2 aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{environment.name}</span>
            <span className="block truncate text-xs text-muted">{environment.slug}</span>
          </span>
        </div>
      );
    },
    header: "Conta",
    meta: { priority: "primary" },
  },
  {
    accessorKey: "role",
    cell: ({ getValue }) => getRoleLabel(getValue<LinkedEnvironment["role"]>()),
    header: "Papel",
    meta: { priority: "secondary" },
  },
  {
    accessorKey: "isCurrent",
    cell: ({ getValue }) =>
      getValue<boolean>() ? (
        <Badge className="gap-1.5 border-primary/25 bg-sidebar-active text-primary">
          <Check aria-hidden="true" className="size-3" />
          Em uso
        </Badge>
      ) : (
        <span className="text-muted">Disponivel</span>
      ),
    header: "Status",
    meta: { priority: "secondary" },
  },
];

type LinkedEnvironmentsTableProps = {
  environments: LinkedEnvironment[];
};

export function LinkedEnvironmentsTable({
  environments,
}: LinkedEnvironmentsTableProps) {
  const router = useRouter();
  const { showToast } = useFeedbackToast();
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedEnvironment | null>(null);
  const [isPending, startTransition] = useTransition();

  function switchEnvironment(environment: LinkedEnvironment) {
    startTransition(async () => {
      const result = await switchLinkedEnvironmentAction(environment.id);
      showToast({ message: result.message, variant: result.ok ? "success" : "error" });
      if (result.ok) router.refresh();
    });
  }

  function unlinkEnvironment() {
    if (!unlinkTarget) return;

    startTransition(async () => {
      const result = await unlinkLinkedEnvironmentAction(unlinkTarget.id);
      showToast({ message: result.message, variant: result.ok ? "success" : "error" });
      setUnlinkTarget(null);
      if (!result.ok) return;
      if (result.signedOut) {
        router.replace("/auth/login");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={environments}
        emptyDescription="Nenhum ambiente ativo esta vinculado a este usuario."
        emptyTitle="Nenhum ambiente vinculado"
        getRowId={(environment) => environment.id}
        rowActions={(environment) => [
          ...(!environment.isCurrent
            ? [{
                disabled: isPending,
                icon: ArrowRightLeft,
                label: "Usar esta conta",
                onSelect: switchEnvironment,
              }]
            : []),
          ...(canUnlinkLinkedEnvironment(environment)
            ? [{
                danger: true,
                disabled: isPending,
                icon: Unlink,
                label: "Desvincular",
                onSelect: setUnlinkTarget,
                separatorBefore: !environment.isCurrent,
              }]
            : []),
        ]}
      />

      <ConfirmDialog
        confirmLabel="Desvincular"
        description={`Voce perdera o acesso a ${unlinkTarget?.name ?? "esta conta"}. Esta acao nao altera usuarios, dados ou configuracoes da conta.`}
        onConfirm={unlinkEnvironment}
        onOpenChange={(open) => !open && setUnlinkTarget(null)}
        open={unlinkTarget !== null}
        title="Desvincular esta conta?"
        variant="danger"
      />
    </>
  );
}

function getRoleLabel(role: LinkedEnvironment["role"]) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Membro";
}
