"use client";

import { Cable, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableControlBar } from "@/components/ui/data-table/data-table-control-bar";
import { deleteChannelAction } from "@/features/channels/channel-actions";
import { channelColumns } from "@/features/channels/channel-columns";
import { ChannelEditorDrawer } from "@/features/channels/channel-editor-drawer";
import { ChannelProviderDrawer } from "@/features/channels/channel-provider-drawer";
import type { ChannelConnection } from "@/features/channels/channel-schema";

type ChannelsWorkspaceProps = {
  canManage: boolean;
  channels: ChannelConnection[];
};

export function ChannelsWorkspace({ canManage, channels }: ChannelsWorkspaceProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelConnection | null>(null);
  const [providerChannel, setProviderChannel] = useState<ChannelConnection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChannelConnection | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const filteredChannels = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return channels;
    return channels.filter((channel) =>
      [channel.name, channel.phoneNumber, channel.kind, channel.provider, channel.status]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(term),
    );
  }, [channels, search]);

  function openNewChannel() {
    setOperationError(null);
    setSelectedChannel(null);
    setEditorOpen(true);
  }

  function openChannel(channel: ChannelConnection) {
    setOperationError(null);
    setSelectedChannel(channel);
    setEditorOpen(true);
  }

  function openProvider(channel: ChannelConnection) {
    setOperationError(null);
    setProviderChannel(channel);
  }

  async function deleteChannel() {
    if (!deleteTarget) return;
    const result = await deleteChannelAction(deleteTarget.id);
    if (!result.ok) setOperationError(result.message);
    else setOperationError(null);
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-7">
      <PageHeader
        actions={canManage ? (
          <Button onClick={openNewChannel}>
            <Plus aria-hidden="true" className="size-4" />
            Novo canal
          </Button>
        ) : null}
        description="Organize os números de WhatsApp da operação. Cada canal mantém modalidade, autenticação e estado próprios."
        eyebrow="Infraestrutura de atendimento"
        title="Canais"
      />

      <DataTableControlBar
        onSearchChange={setSearch}
        resultLabel={`${filteredChannels.length} ${filteredChannels.length === 1 ? "canal" : "canais"}`}
        searchPlaceholder="Buscar canal ou número"
        searchValue={search}
      />

      {operationError ? (
        <p className="rounded-[var(--radius-control)] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          {operationError}
        </p>
      ) : null}

      <DataTable
        columns={channelColumns}
        data={filteredChannels}
        emptyAction={canManage ? <Button onClick={openNewChannel} size="sm">Cadastrar primeiro canal</Button> : undefined}
        emptyDescription={search ? "Ajuste a busca para encontrar outro canal." : "Cadastre o primeiro número para preparar a operação de atendimento."}
        emptyTitle={search ? "Nenhum canal corresponde à busca" : "Nenhum canal cadastrado"}
        getRowId={(channel) => channel.id}
        getRowSignal={(channel) => channel.status === "connected" ? "success" : channel.status === "failed" ? "danger" : channel.status === "draft" || channel.status === "awaiting_pairing" ? "warning" : "neutral"}
        onRowClick={canManage ? (channel) => channel.kind === "unofficial" ? openProvider(channel) : openChannel(channel) : undefined}
        rowActions={canManage ? (channel) => [
          ...(channel.kind === "unofficial" ? [{ icon: Cable, label: "Conectar", onSelect: openProvider }] : []),
          { icon: Pencil, label: "Editar cadastro", onSelect: openChannel },
          { danger: true, icon: Trash2, label: "Excluir", onSelect: setDeleteTarget, separatorBefore: true },
        ] : undefined}
      />

      <ChannelEditorDrawer
        channel={selectedChannel}
        onClose={() => setEditorOpen(false)}
        onSaved={() => router.refresh()}
        open={editorOpen}
      />
      <ChannelProviderDrawer
        channel={providerChannel}
        onClose={() => setProviderChannel(null)}
        onSaved={() => router.refresh()}
        open={providerChannel !== null}
      />
      <ConfirmDialog
        confirmLabel="Excluir canal"
        description={`O canal ${deleteTarget?.name ?? "selecionado"} será removido. Canais vinculados a atendimentos não podem ser excluídos.`}
        onConfirm={deleteChannel}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={deleteTarget !== null}
        title="Excluir este canal?"
        variant="danger"
      />
    </div>
  );
}
