"use client";

import { Archive, MessageSquareText, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableControlBar } from "@/components/ui/data-table/data-table-control-bar";
import { Select } from "@/components/ui/select";
import { archiveContactAction } from "@/features/contacts/contact-actions";
import {
  contactColumns,
  contactStageLabels,
} from "@/features/contacts/contact-columns";
import { ContactEditorDrawer } from "@/features/contacts/contact-editor-drawer";
import type {
  Contact,
  ContactLifecycleStage,
} from "@/features/contacts/contact-schema";
import { formatContactPhone } from "@/features/contacts/phone-normalization";
import type { Tag } from "@/features/tags/tag-schema";

type StageFilter = "all" | ContactLifecycleStage;

type ContactsWorkspaceProps = {
  contacts: Contact[];
  tags: Tag[];
};

export function ContactsWorkspace({ contacts, tags }: ContactsWorkspaceProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<StageFilter>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Contact | null>(null);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return contacts.filter((contact) => {
      if (stage !== "all" && contact.lifecycleStage !== stage) return false;
      if (!term) return true;
      return [
        contact.name,
        contact.phone,
        contact.email,
        contact.tags.map((tag) => tag.name).join(" "),
        contact.channelNames.join(" "),
        contactStageLabels[contact.lifecycleStage],
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(term);
    });
  }, [contacts, search, stage]);

  function openNewContact() {
    setOperationError(null);
    setOperationMessage(null);
    setSelectedContact(null);
    setEditorOpen(true);
  }

  function openContact(contact: Contact) {
    setOperationError(null);
    setOperationMessage(null);
    setSelectedContact(contact);
    setEditorOpen(true);
  }

  async function archiveContact() {
    if (!archiveTarget) return;
    const result = await archiveContactAction(archiveTarget.id);
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
          <Button onClick={openNewContact}>
            <Plus aria-hidden="true" className="size-4" />
            Novo contato
          </Button>
        )}
        description="Encontre pessoas recebidas pelo atendimento, complete dados e qualifique possíveis leads sem perder o histórico."
        eyebrow="Relacionamento operacional"
        title="Contatos"
      />

      <DataTableControlBar
        actions={(
          <Select
            aria-label="Filtrar por estágio"
            className="min-w-40"
            onChange={(event) => setStage(event.target.value as StageFilter)}
            value={stage}
          >
            <option value="all">Todos os estágios</option>
            <option value="new">Novos</option>
            <option value="lead">Leads</option>
            <option value="customer">Clientes</option>
            <option value="discarded">Descartados</option>
          </Select>
        )}
        onSearchChange={setSearch}
        resultLabel={`${filteredContacts.length} ${filteredContacts.length === 1 ? "contato" : "contatos"}`}
        searchPlaceholder="Buscar nome, telefone, e-mail ou tag"
        searchValue={search}
      />

      {operationError ? (
        <p className="rounded-[var(--radius-control)] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          {operationError}
        </p>
      ) : operationMessage ? (
        <p className="rounded-[var(--radius-control)] border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-strong" role="status">
          {operationMessage}
        </p>
      ) : null}

      <DataTable
        columns={contactColumns}
        data={filteredContacts}
        emptyAction={!search && stage === "all"
          ? <Button onClick={openNewContact} size="sm">Cadastrar primeiro contato</Button>
          : undefined}
        emptyDescription={search || stage !== "all"
          ? "Ajuste a busca ou o estágio para encontrar outros contatos."
          : "Contatos surgem automaticamente nas mensagens recebidas ou podem ser cadastrados pela equipe."}
        emptyTitle={search || stage !== "all"
          ? "Nenhum contato corresponde aos filtros"
          : "Nenhum contato cadastrado"}
        getRowId={(contact) => contact.id}
        getRowSignal={(contact) => contact.phoneStatus === "unsupported_country"
          ? "warning"
          : contact.lifecycleStage === "customer"
            ? "success"
            : contact.lifecycleStage === "lead"
              ? "primary"
              : "neutral"}
        onRowClick={openContact}
        rowActions={(contact) => [
          ...(contact.lastConversationId ? [{
            icon: MessageSquareText,
            label: "Abrir atendimento",
            onSelect: () => router.push(`/app/support/${contact.lastConversationId}`),
          }] : []),
          { icon: Pencil, label: "Editar cadastro", onSelect: openContact },
          {
            icon: Archive,
            label: "Arquivar",
            onSelect: setArchiveTarget,
            separatorBefore: true,
          },
        ]}
      />

      <ContactEditorDrawer
        availableTags={tags}
        contact={selectedContact}
        onClose={() => setEditorOpen(false)}
        onSaved={(message) => {
          setOperationError(null);
          setOperationMessage(message);
          router.refresh();
        }}
        open={editorOpen}
      />
      <ConfirmDialog
        confirmLabel="Arquivar contato"
        description={`${archiveTarget?.name?.trim()
          || formatContactPhone(archiveTarget?.phone ?? null, archiveTarget?.phoneStatus ?? "invalid")} sairá da lista. Atendimentos e mensagens serão preservados.`}
        onConfirm={archiveContact}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        open={archiveTarget !== null}
        title="Arquivar este contato?"
      />
    </div>
  );
}
