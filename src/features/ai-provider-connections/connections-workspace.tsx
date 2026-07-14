"use client";

import { CheckCircle2, Plus, ShieldCheck, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableControlBar } from "@/components/ui/data-table/data-table-control-bar";
import { deleteAiProviderConnectionAction, setDefaultAiProviderConnectionAction } from "@/features/ai-provider-connections/actions";
import { aiProviderConnectionColumns } from "@/features/ai-provider-connections/connection-columns";
import { ConnectionEditorDrawer } from "@/features/ai-provider-connections/connection-editor-drawer";
import type { AiProviderConnectionListItem } from "@/features/ai-provider-connections/queries";

export function ConnectionsWorkspace({ canManage, connections }: { canManage: boolean; connections: AiProviderConnectionListItem[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AiProviderConnectionListItem | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const filteredConnections = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return connections;
    return connections.filter((connection) =>
      [connection.name, connection.provider, connection.defaultModel, ...connection.availableModels]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(term),
    );
  }, [connections, search]);

  async function setDefault(connection: AiProviderConnectionListItem) {
    try {
      const result = await setDefaultAiProviderConnectionAction(connection.id);
      setFeedback({ kind: result.ok ? "success" : "error", message: result.message });
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Não foi possível alterar a conexão padrão." });
    }
  }

  async function deleteConnection() {
    if (!deleteTarget) return;
    try {
      const result = await deleteAiProviderConnectionAction(deleteTarget.id);
      setFeedback({ kind: result.ok ? "success" : "error", message: result.message });
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Não foi possível excluir a conexão." });
    }
  }

  return (
    <section className="space-y-7">
      <PageHeader
        actions={canManage ? <Button onClick={() => setEditorOpen(true)}><Plus aria-hidden="true" className="size-4" />Nova conexão</Button> : null}
        description="Gerencie credenciais e modelos que o workspace pode usar. A seleção final acontece no cadastro de cada assistente."
        eyebrow="Configurações"
        title="Conexões de IA"
      />

      <Card className="border-primary/15 bg-panel-elevated">
        <CardContent className="flex items-start gap-3 p-4">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm leading-6 text-muted-strong">
            As chaves são criptografadas antes da persistência. A interface recebe apenas provedor, estado, modelos e uma dica dos últimos caracteres.
          </p>
        </CardContent>
      </Card>

      <DataTableControlBar
        onSearchChange={setSearch}
        resultLabel={`${filteredConnections.length} ${filteredConnections.length === 1 ? "conexão" : "conexões"}`}
        searchPlaceholder="Buscar conexão ou modelo"
        searchValue={search}
      />

      {feedback ? (
        <p className={feedback.kind === "success" ? "rounded-[var(--radius-control)] border border-primary/20 bg-sidebar-active/35 px-4 py-3 text-sm text-primary" : "rounded-[var(--radius-control)] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"} role="status">
          <CheckCircle2 aria-hidden="true" className="mr-2 inline size-4" />{feedback.message}
        </p>
      ) : null}

      <DataTable
        columns={aiProviderConnectionColumns}
        data={filteredConnections}
        emptyAction={canManage ? <Button onClick={() => setEditorOpen(true)} size="sm">Cadastrar primeira conexão</Button> : undefined}
        emptyDescription={search ? "Ajuste a busca para encontrar outra conexão." : "Cadastre um provedor para liberar modelos nos assistentes do workspace."}
        emptyTitle={search ? "Nenhuma conexão corresponde à busca" : "Nenhuma conexão cadastrada"}
        getRowId={(connection) => connection.id}
        getRowSignal={(connection) => connection.status === "active" ? "success" : connection.status === "needs_attention" ? "warning" : "neutral"}
        rowActions={canManage ? (connection) => [
          ...(!connection.isDefault ? [{ icon: Star, label: "Tornar padrão", onSelect: setDefault }] : []),
          { danger: true, icon: Trash2, label: "Excluir", onSelect: setDeleteTarget, separatorBefore: !connection.isDefault },
        ] : undefined}
      />

      <ConnectionEditorDrawer
        onClose={() => setEditorOpen(false)}
        onSaved={(message) => { setFeedback({ kind: "success", message }); router.refresh(); }}
        open={editorOpen}
      />
      <ConfirmDialog
        confirmLabel="Excluir conexão"
        description={`A conexão ${deleteTarget?.name ?? "selecionada"} será removida. Assistentes vinculados podem deixar de funcionar.`}
        onConfirm={deleteConnection}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={deleteTarget !== null}
        title="Excluir esta conexão?"
        variant="danger"
      />
    </section>
  );
}
