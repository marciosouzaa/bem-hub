"use client";

import { Pencil, Plus, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableControlBar } from "@/components/ui/data-table/data-table-control-bar";
import { Select } from "@/components/ui/select";
import { useFeedbackToast } from "@/components/ui/feedback-toast";
import { removeMemberAction } from "@/features/members/actions";
import { memberColumns } from "@/features/members/member-columns";
import { MemberEditorDrawer } from "@/features/members/member-editor-drawer";
import type { OrganizationMemberItem } from "@/features/members/queries";

type MemberFilter = "all" | "owner" | "admin" | "member" | "active" | "invited" | "removed";

type MembersWorkspaceProps = {
  canManage: boolean;
  memberLimit: number;
  members: OrganizationMemberItem[];
  organizationName: string;
};

export function MembersWorkspace({
  canManage,
  memberLimit,
  members,
  organizationName,
}: MembersWorkspaceProps) {
  const router = useRouter();
  const { showToast } = useFeedbackToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrganizationMemberItem | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OrganizationMemberItem | null>(null);

  const activeSeatCount = members.filter((member) =>
    member.status === "active" || member.status === "invited"
  ).length;

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return members.filter((member) => {
      if (filter !== "all") {
        if (["owner", "admin", "member"].includes(filter) && member.role !== filter) {
          return false;
        }
        if (["active", "invited", "removed"].includes(filter) && member.status !== filter) {
          return false;
        }
      }

      if (!term) return true;

      return [
        member.name,
        member.email,
        member.role,
        member.status,
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(term);
    });
  }, [filter, members, search]);

  function openNewMember() {
    setSelectedMember(null);
    setEditorOpen(true);
  }

  function openMember(member: OrganizationMemberItem) {
    if (member.isOwner || !canManage) return;
    setSelectedMember(member);
    setEditorOpen(true);
  }

  async function removeMember() {
    if (!removeTarget) return;
    const result = await removeMemberAction(removeTarget.userId);
    if (result.ok) {
      showToast({ message: result.message, variant: "success" });
      router.refresh();
    } else {
      showToast({ message: result.message, variant: "error" });
    }
    setRemoveTarget(null);
  }

  return (
    <div className="space-y-7">
      <PageHeader
        actions={canManage ? (
          <Button onClick={openNewMember}>
            <Plus aria-hidden="true" className="size-4" />
            Novo membro
          </Button>
        ) : null}
        description={`Gerencie quem acessa ${organizationName}, com convite por e-mail e confirmacao antes de liberar dados do tenant.`}
        eyebrow="Controle de acesso"
        title="Equipe"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Assentos usados" value={`${activeSeatCount}/${memberLimit}`} />
        <Metric label="Ativos" value={String(members.filter((member) => member.status === "active").length)} />
        <Metric label="Convites pendentes" value={String(members.filter((member) => member.status === "invited").length)} />
      </div>

      <DataTableControlBar
        actions={(
          <Select
            aria-label="Filtrar equipe"
            className="min-w-44"
            onChange={(event) => setFilter(event.target.value as MemberFilter)}
            value={filter}
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="invited">Convidados</option>
            <option value="removed">Removidos</option>
            <option value="owner">Owners</option>
            <option value="admin">Admins</option>
            <option value="member">Membros</option>
          </Select>
        )}
        onSearchChange={setSearch}
        resultLabel={`${filteredMembers.length} ${filteredMembers.length === 1 ? "usuario" : "usuarios"}`}
        searchPlaceholder="Buscar nome, e-mail, papel ou status"
        searchValue={search}
      />

      <DataTable
        columns={memberColumns}
        data={filteredMembers}
        emptyAction={!search && filter === "all" && canManage
          ? <Button onClick={openNewMember} size="sm">Convidar primeiro membro</Button>
          : undefined}
        emptyDescription={search || filter !== "all"
          ? "Ajuste a busca ou o filtro para encontrar outros usuarios."
          : "Convide usuarios para operar neste workspace sem compartilhar a conta owner."}
        emptyTitle={search || filter !== "all"
          ? "Nenhum usuario corresponde aos filtros"
          : "Nenhum membro cadastrado"}
        getRowId={(member) => member.userId}
        getRowSignal={(member) => member.status === "invited"
          ? "warning"
          : member.status === "active"
            ? "success"
            : "neutral"}
        onRowClick={canManage ? openMember : undefined}
        rowActions={(member) => {
          if (!canManage || member.isOwner) return [];
          return [
            { icon: Pencil, label: "Editar acesso", onSelect: openMember },
            {
              icon: UserMinus,
              label: member.status === "invited" ? "Revogar convite" : "Remover acesso",
              onSelect: setRemoveTarget,
              separatorBefore: true,
            },
          ];
        }}
      />

      <MemberEditorDrawer
        member={selectedMember}
        onClose={() => setEditorOpen(false)}
        onSaved={(message) => {
          showToast({ message, variant: "success" });
          router.refresh();
        }}
        open={editorOpen}
      />

      <ConfirmDialog
        confirmLabel={removeTarget?.status === "invited" ? "Revogar convite" : "Remover acesso"}
        description={`${removeTarget?.name ?? "Este usuario"} deixara de acessar esta conta. Dados historicos permanecem preservados.`}
        onConfirm={removeMember}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        open={removeTarget !== null}
        title={removeTarget?.status === "invited" ? "Revogar convite?" : "Remover acesso?"}
        variant="danger"
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-panel-border bg-panel px-4 py-3">
      <p className="text-xs uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
