"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { EntityDrawer } from "@/components/ui/entity-drawer";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createChannelAction, updateChannelAction } from "@/features/channels/channel-actions";
import {
  channelFormSchema,
  type ChannelConnection,
  type ChannelFormValues,
} from "@/features/channels/channel-schema";

const formId = "channel-editor-form";

function getDefaultValues(channel: ChannelConnection | null): ChannelFormValues {
  return {
    authMethod: channel?.authMethod ?? "qr",
    kind: channel?.kind ?? "unofficial",
    name: channel?.name ?? "",
    phone: channel?.phoneNumber ?? "",
  };
}

type ChannelEditorDrawerProps = {
  channel: ChannelConnection | null;
  onClose: () => void;
  onSaved: () => void;
  open: boolean;
};

export function ChannelEditorDrawer({ channel, onClose, onSaved, open }: ChannelEditorDrawerProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const isEditing = channel !== null;
  const {
    control,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ChannelFormValues>({
    defaultValues: getDefaultValues(channel),
    resolver: zodResolver(channelFormSchema),
  });
  const kind = useWatch({ control, name: "kind" });

  useEffect(() => {
    if (!open) return;
    reset(getDefaultValues(channel));
  }, [channel, open, reset]);

  function closeEditor() {
    setActionError(null);
    onClose();
  }

  async function submit(values: ChannelFormValues) {
    setActionError(null);
    const result = channel
      ? await updateChannelAction(channel.id, values)
      : await createChannelAction(values);

    if (!result.ok) {
      setActionError(result.message);
      return;
    }

    reset(values);
    closeEditor();
    onSaved();
  }

  return (
    <EntityDrawer
      description={isEditing ? "Atualize a identificação e o método de pareamento deste número." : "Cadastre o número; depois valide Uazapi ou Z-API na ação Conectar."}
      formId={formId}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={closeEditor}
      open={open}
      saveLabel={isEditing ? "Salvar alterações" : "Cadastrar canal"}
      title={isEditing ? "Editar canal" : "Novo canal"}
    >
      <form className="space-y-7" id={formId} onSubmit={handleSubmit(submit)}>
        <FormSection
          description="Use dados reconhecíveis pela equipe que fará o atendimento."
          title="Identificação"
        >
          <FormField error={errors.name?.message} htmlFor="channel-name" label="Nome do canal">
            <Input
              aria-invalid={Boolean(errors.name)}
              autoFocus
              id="channel-name"
              placeholder="WhatsApp comercial"
              {...register("name")}
            />
          </FormField>
          <FormField
            description="Inclua código do país e DDD. Exemplo: +55 11 99999-9999."
            error={errors.phone?.message}
            htmlFor="channel-phone"
            label="Número do WhatsApp"
          >
            <Input
              aria-invalid={Boolean(errors.phone)}
              id="channel-phone"
              inputMode="tel"
              placeholder="+55 11 99999-9999"
              {...register("phone")}
            />
          </FormField>
        </FormSection>

        <FormSection
          description="Canais oficiais e não oficiais mantêm sessões e credenciais isoladas."
          title="Modalidade"
        >
          <FormField htmlFor="channel-kind" label="Tipo de integração">
            {isEditing ? (
              <>
                <input type="hidden" {...register("kind")} />
                <div className="flex h-10 items-center rounded-[var(--radius-control)] border border-panel-border bg-panel-subtle px-3 text-sm text-muted-strong">
                  {kind === "official" ? "API oficial" : "API não oficial"}
                </div>
              </>
            ) : (
              <Select id="channel-kind" {...register("kind")}>
                <option value="official">API oficial</option>
                <option value="unofficial">API não oficial</option>
              </Select>
            )}
          </FormField>
          <FormField
            description="QR Code ou código de pareamento gerado pelo provedor."
            htmlFor="channel-auth-method"
            label="Autenticação preferida"
          >
            <Select id="channel-auth-method" {...register("authMethod")}>
              <option value="qr">QR Code</option>
              <option value="pin">Código de pareamento</option>
            </Select>
          </FormField>
        </FormSection>

        {actionError ? (
          <p className="rounded-[var(--radius-control)] border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">
            {actionError}
          </p>
        ) : null}
      </form>
    </EntityDrawer>
  );
}
