"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RadioTower } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { Select } from "@/components/ui/select";
import { ChannelProviderCredentialFields } from "@/features/channels/channel-provider-credential-fields";
import {
  ChannelConnectionState,
  ChannelPairingPanel,
} from "@/features/channels/channel-provider-status-panels";
import {
  configureChannelWebhookAction,
  configureChannelProviderAction,
  disconnectChannelProviderAction,
  refreshChannelProviderHealthAction,
  requestChannelPairingAction,
} from "@/features/channels/channel-provider-actions";
import {
  channelProviderFormSchema,
  toChannelProviderCredentials,
  type ChannelProviderFormValues,
} from "@/features/channels/channel-provider-schema";
import type { ChannelPairing } from "@/features/channels/providers/channel-provider-adapter";
import type { ChannelConnection } from "@/features/channels/channel-schema";

const formId = "channel-provider-form";

function getDefaultValues(channel: ChannelConnection): ChannelProviderFormValues {
  const provider = (
    ["uazapi", "z_api", "evolution", "wuzapi"] as const
  ).find((candidate) => candidate === channel.provider) ?? "evolution";

  return {
    apiKey: "",
    baseUrl: channel.providerBaseUrl
      ?? (provider === "uazapi" ? "https://free.uazapi.com" : ""),
    clientToken: "",
    instanceId: channel.externalInstanceId ?? "",
    instanceName: channel.externalInstanceId ?? `bem-hub-${channel.id.slice(0, 8)}`,
    instanceToken: "",
    provider,
    userToken: "",
    webhookHmacKey: "",
  };
}

type ChannelProviderDrawerProps = {
  channel: ChannelConnection | null;
  onClose: () => void;
  onSaved: () => void;
  open: boolean;
};

export function ChannelProviderDrawer({
  channel,
  onClose,
  onSaved,
  open,
}: ChannelProviderDrawerProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pairing, setPairing] = useState<ChannelPairing | null>(null);
  const [operating, setOperating] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const {
    control,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ChannelProviderFormValues>({
    defaultValues: channel ? getDefaultValues(channel) : undefined,
    resolver: zodResolver(channelProviderFormSchema),
  });
  const provider = useWatch({ control, name: "provider" });

  useEffect(() => {
    if (!open || !channel) return;
    reset(getDefaultValues(channel));
  }, [channel, open, reset]);

  if (!channel) return null;

  async function submit(values: ChannelProviderFormValues) {
    if (!channel) return;
    setFeedback(null);
    const result = await configureChannelProviderAction(
      channel.id,
      toChannelProviderCredentials(values),
    );
    setFeedback(result.message);
    if (!result.ok) return;
    reset({
      ...values,
      apiKey: "",
      clientToken: "",
      instanceToken: "",
      userToken: "",
      webhookHmacKey: "",
    });
    onSaved();
  }

  function closeDrawer() {
    setFeedback(null);
    setPairing(null);
    onClose();
  }

  async function runOperation<T extends { message: string; ok: boolean }>(
    operation: () => Promise<T>,
  ): Promise<T> {
    setOperating(true);
    setFeedback(null);
    try {
      const result = await operation();
      setFeedback(result.message);
      if (result.ok) onSaved();
      return result;
    } finally {
      setOperating(false);
    }
  }

  async function runPairing() {
    if (!channel) return;
    const result = await runOperation(() => requestChannelPairingAction(channel.id));
    if (result.ok) setPairing(result.pairing ?? null);
  }

  async function disconnect() {
    if (!channel) return;
    setDisconnectOpen(false);
    await runOperation(() => disconnectChannelProviderAction(channel.id));
  }

  return (
    <>
      <EntityDrawer
        description="Credenciais ficam criptografadas e são usadas somente pelo backend do BEM HUB."
        formId={formId}
        isDirty={isDirty}
        isSubmitting={isSubmitting || operating}
        onClose={closeDrawer}
        open={open}
        saveLabel={channel.hasCredentials ? "Substituir credenciais" : "Validar e salvar"}
        size="md"
        title={`Conectar ${channel.name}`}
      >
        <form className="space-y-7" id={formId} onSubmit={handleSubmit(submit)}>
          <ChannelConnectionState channel={channel} />

          <FormSection
            description="Cada provedor implementa o mesmo contrato interno de conexão."
            title="Provedor"
          >
            <FormField error={errors.provider?.message} htmlFor="channel-provider" label="API não oficial">
              <Select id="channel-provider" {...register("provider")}>
                <option value="evolution">Evolution API</option>
                <option value="wuzapi">Wuzapi</option>
                <option value="uazapi">Uazapi</option>
                <option disabled value="z_api">Z-API — pausada</option>
              </Select>
            </FormField>
          </FormSection>

          <ChannelProviderCredentialFields
            errors={errors}
            provider={provider}
            register={register}
          />

          {feedback ? (
            <p className="rounded-[var(--radius-control)] border border-panel-border bg-panel-subtle px-3 py-2.5 text-sm text-muted-strong" role="status">
              {feedback}
            </p>
          ) : null}

          {pairing ? <ChannelPairingPanel pairing={pairing} /> : null}

          {channel.hasCredentials ? (
            <>
              <FormSection
                description="Um endpoint seguro recebe eventos do provedor e os transforma em atendimentos."
                title="Recebimento"
              >
                <div className="flex flex-col gap-4 rounded-[var(--radius-panel)] border border-panel-border bg-panel-subtle p-4">
                  <div className="flex items-start gap-3">
                    <RadioTower className="mt-0.5 size-4 text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {channel.webhookVerifiedAt
                          ? "Entrada confirmada"
                          : channel.webhookConfiguredAt
                            ? "Aguardando primeira mensagem"
                            : "Entrada ainda não ativada"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {channel.webhookVerifiedAt
                          ? "O BEM HUB já recebeu eventos deste canal."
                          : channel.webhookConfiguredAt
                            ? "Envie uma mensagem de outro número para validar."
                            : "Ative para configurar o webhook automaticamente no provedor."}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Button
                      disabled={operating}
                      onClick={() => runOperation(() => configureChannelWebhookAction(channel.id))}
                      type="button"
                      variant="secondary"
                    >
                      {channel.webhookConfiguredAt ? "Reconfigurar recebimento" : "Ativar recebimento"}
                    </Button>
                  </div>
                </div>
              </FormSection>

              <FormSection
                description="Atualize o estado antes de reconectar ou diagnosticar uma falha."
                title="Operação"
              >
                <div className="flex flex-wrap gap-2">
                  <Button disabled={operating} onClick={runPairing} type="button" variant="secondary">
                    {channel.provider !== "wuzapi" && channel.authMethod === "pin"
                      ? "Gerar código"
                      : "Gerar QR Code"}
                  </Button>
                  <Button disabled={operating} onClick={() => runOperation(() => refreshChannelProviderHealthAction(channel.id))} type="button" variant="ghost">
                    Atualizar estado
                  </Button>
                  <Button disabled={operating} onClick={() => setDisconnectOpen(true)} type="button" variant="danger">
                    Desconectar
                  </Button>
                </div>
              </FormSection>
            </>
          ) : null}
        </form>
      </EntityDrawer>

      <ConfirmDialog
        confirmLabel="Desconectar número"
        description="A sessão será encerrada no provedor. O histórico do atendimento será preservado."
        onConfirm={disconnect}
        onOpenChange={setDisconnectOpen}
        open={disconnectOpen}
        title="Desconectar este número?"
        variant="danger"
      />
    </>
  );
}
