"use client";

import { CheckCircle2, Lock, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableControlBar } from "@/components/ui/data-table/data-table-control-bar";
import type { AiProviderConnectionListItem } from "@/features/ai-provider-connections/queries";
import { deleteAssistantAction, setDefaultAssistantAction } from "@/features/assistants/actions";
import { assistantColumns } from "@/features/assistants/assistant-columns";
import { AssistantEditorDrawer } from "@/features/assistants/assistant-editor-drawer";
import type { AssistantListItem } from "@/features/assistants/queries";
import { UpgradeCTA } from "@/features/billing/upgrade-cta";

type AssistantsWorkspaceProps = {
  assistants: AssistantListItem[];
  canManage: boolean;
  connections: AiProviderConnectionListItem[];
  featureEnabled: boolean;
  planName: string;
};

export function AssistantsWorkspace({ assistants, canManage, connections, featureEnabled, planName }: AssistantsWorkspaceProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<AssistantListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssistantListItem | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const filteredAssistants = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return assistants;
    return assistants.filter((assistant) =>
      [assistant.name, assistant.area, assistant.description, assistant.provider, assistant.model]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(term),
    );
  }, [assistants, search]);

  function openNewAssistant() {
    setFeedback(null);
    setSelectedAssistant(null);
    setEditorOpen(true);
  }

  function openAssistant(assistant: AssistantListItem) {
    setFeedback(null);
    setSelectedAssistant(assistant);
    setEditorOpen(true);
  }

  async function setDefault(assistant: AssistantListItem) {
    try {
      const result = await setDefaultAssistantAction(assistant.id);
      setFeedback({ kind: result.ok ? "success" : "error", message: result.message });
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Não foi possível alterar o assistente padrão." });
    }
  }

  async function deleteAssistant() {
    if (!deleteTarget) return;
    try {
      const result = await deleteAssistantAction(deleteTarget.id);
      setFeedback({ kind: result.ok ? "success" : "error", message: result.message });
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Não foi possível excluir o assistente." });
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        actions={canManage ? (
          <Button onClick={openNewAssistant}>
            <Plus aria-hidden="true" className="size-4" />
            Novo assistente
          </Button>
        ) : null}
        description="Configure especialistas oficiais com escopo, instruções e modelos controlados pela empresa."
        eyebrow="Inteligência operacional"
        title="Assistentes"
      />

      {!featureEnabled ? (
        <UpgradeCTA
          description={`O módulo de assistentes não está disponível no plano ${planName}. Atualize o plano para criar e gerenciar especialistas oficiais.`}
          feature="assistants"
          planName={planName}
          title="Assistentes bloqueados neste plano"
        />
      ) : !canManage ? (
        <Card className="border-warning/40 bg-panel-elevated">
          <CardContent className="flex items-start gap-3 p-4">
            <Lock aria-hidden="true" className="mt-0.5 size-4 text-warning" />
            <div>
              <p className="text-sm font-medium">Modo somente leitura</p>
              <p className="mt-1 text-sm text-muted-strong">Membros podem usar os assistentes; owners e admins gerenciam o cadastro.</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <DataTableControlBar
        onSearchChange={setSearch}
        resultLabel={`${filteredAssistants.length} ${filteredAssistants.length === 1 ? "assistente" : "assistentes"}`}
        searchPlaceholder="Buscar assistente, área ou modelo"
        searchValue={search}
      />

      {feedback ? (
        <p className={feedback.kind === "success" ? "rounded-[var(--radius-control)] border border-primary/20 bg-sidebar-active/35 px-4 py-3 text-sm text-primary" : "rounded-[var(--radius-control)] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"} role="status">
          <CheckCircle2 aria-hidden="true" className="mr-2 inline size-4" />
          {feedback.message}
        </p>
      ) : null}

      <DataTable
        columns={assistantColumns}
        data={filteredAssistants}
        emptyAction={canManage ? <Button onClick={openNewAssistant} size="sm">Criar primeiro assistente</Button> : undefined}
        emptyDescription={search ? "Ajuste a busca para encontrar outro especialista." : "Crie um especialista oficial para padronizar como a equipe usa IA."}
        emptyTitle={search ? "Nenhum assistente corresponde à busca" : "Nenhum assistente cadastrado"}
        getRowId={(assistant) => assistant.id}
        getRowSignal={(assistant) => assistant.isDefault ? "primary" : "neutral"}
        onRowClick={canManage ? openAssistant : undefined}
        rowActions={canManage ? (assistant) => [
          { icon: Pencil, label: "Editar", onSelect: openAssistant },
          ...(!assistant.isDefault ? [{ icon: Star, label: "Tornar padrão", onSelect: setDefault }] : []),
          { danger: true, icon: Trash2, label: "Excluir", onSelect: setDeleteTarget, separatorBefore: true },
        ] : undefined}
      />

      <AssistantEditorDrawer
        assistant={selectedAssistant}
        connections={connections}
        onClose={() => setEditorOpen(false)}
        onSaved={(message) => {
          setFeedback({ kind: "success", message });
          router.refresh();
        }}
        open={editorOpen}
      />
      <ConfirmDialog
        confirmLabel="Excluir assistente"
        description={`O assistente ${deleteTarget?.name ?? "selecionado"} será removido do workspace. Conversas já registradas são preservadas.`}
        onConfirm={deleteAssistant}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={deleteTarget !== null}
        title="Excluir este assistente?"
        variant="danger"
      />
    </div>
  );
}
