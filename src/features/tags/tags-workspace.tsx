"use client";

import { Archive, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableControlBar } from "@/components/ui/data-table/data-table-control-bar";
import { archiveTagAction } from "@/features/tags/tag-actions";
import { tagColumns } from "@/features/tags/tag-columns";
import { TagEditorDrawer } from "@/features/tags/tag-editor-drawer";
import type { Tag } from "@/features/tags/tag-schema";

export function TagsWorkspace({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Tag | null>(null);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const filteredTags = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return tags;
    return tags.filter((tag) => [
      tag.name,
      tag.description,
      tag.hexColor,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("pt-BR")
      .includes(term));
  }, [search, tags]);

  function openNewTag() {
    setOperationError(null);
    setOperationMessage(null);
    setSelectedTag(null);
    setEditorOpen(true);
  }

  function openTag(tag: Tag) {
    setOperationError(null);
    setOperationMessage(null);
    setSelectedTag(tag);
    setEditorOpen(true);
  }

  async function archiveTag() {
    if (!archiveTarget) return;
    const result = await archiveTagAction(archiveTarget.id);
    if (result.ok) {
      setOperationError(null);
      setOperationMessage(result.message);
      router.refresh();
    } else {
      setOperationError(result.message);
      setOperationMessage(null);
    }
    setArchiveTarget(null);
  }

  return (
    <div className="space-y-7">
      <PageHeader
        actions={(
          <Button onClick={openNewTag}>
            <Plus aria-hidden="true" className="size-4" />
            Nova etiqueta
          </Button>
        )}
        description="Padronize classificações e use as mesmas etiquetas em todos os contatos da organização."
        eyebrow="Organização de contatos"
        title="Etiquetas"
      />

      <DataTableControlBar
        onSearchChange={setSearch}
        resultLabel={`${filteredTags.length} ${filteredTags.length === 1 ? "etiqueta" : "etiquetas"}`}
        searchPlaceholder="Buscar nome, descrição ou cor"
        searchValue={search}
      />

      {operationError ? (
        <p
          className="rounded-[var(--radius-control)] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {operationError}
        </p>
      ) : operationMessage ? (
        <p
          className="rounded-[var(--radius-control)] border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-strong"
          role="status"
        >
          {operationMessage}
        </p>
      ) : null}

      <DataTable
        columns={tagColumns}
        data={filteredTags}
        emptyAction={!search
          ? <Button onClick={openNewTag} size="sm">Criar primeira etiqueta</Button>
          : undefined}
        emptyDescription={search
          ? "Ajuste a busca para encontrar outras etiquetas."
          : "Crie classificações para padronizar o cadastro e a busca de contatos."}
        emptyTitle={search
          ? "Nenhuma etiqueta corresponde à busca"
          : "Nenhuma etiqueta cadastrada"}
        getRowId={(tag) => tag.id}
        onRowClick={openTag}
        rowActions={(tag) => [
          { icon: Pencil, label: "Editar etiqueta", onSelect: openTag },
          {
            disabled: tag.usageCount > 0,
            icon: Archive,
            label: tag.usageCount > 0
              ? `Em uso por ${tag.usageCount} ${tag.usageCount === 1 ? "contato" : "contatos"}`
              : "Arquivar",
            onSelect: setArchiveTarget,
            separatorBefore: true,
          },
        ]}
      />

      <TagEditorDrawer
        onClose={() => setEditorOpen(false)}
        onSaved={(message) => {
          setOperationError(null);
          setOperationMessage(message);
          router.refresh();
        }}
        open={editorOpen}
        tag={selectedTag}
      />
      <ConfirmDialog
        confirmLabel="Arquivar etiqueta"
        description={`${archiveTarget?.name ?? "Esta etiqueta"} sairá das opções disponíveis para contatos.`}
        onConfirm={archiveTag}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        open={archiveTarget !== null}
        title="Arquivar esta etiqueta?"
      />
    </div>
  );
}
