"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RadioTower } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  return {
    baseUrl: channel.providerBaseUrl ?? "https://free.uazapi.com",
    clientToken: "",
    instanceId: channel.externalInstanceId ?? "",
    instanceToken: "",
    provider: channel.provider === "z_api" ? "z_api" : "uazapi",
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
    reset({ ...values, clientToken: "", instanceToken: "" });
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
          <ConnectionState channel={channel} />

          <FormSection
            description="Cada provedor implementa o mesmo contrato interno de conexão."
            title="Provedor"
          >
            <FormField error={errors.provider?.message} htmlFor="channel-provider" label="API não oficial">
              <Select id="channel-provider" {...register("provider")}>
                <option value="uazapi">Uazapi</option>
                <option value="z_api">Z-API</option>
              </Select>
            </FormField>
          </FormSection>

          {provider === "z_api" ? (
            <FormSection
              description="Disponíveis em Instâncias Web e Segurança no painel da Z-API."
              title="Credenciais Z-API"
            >
              <FormField error={errors.instanceId?.message} htmlFor="z-api-instance-id" label="ID da instância">
                <Input autoComplete="off" className="font-mono" id="z-api-instance-id" {...register("instanceId")} />
              </FormField>
              <SecretField error={errors.instanceToken?.message} id="z-api-instance-token" label="Token da instância" registration={register("instanceToken")} />
              <SecretField error={errors.clientToken?.message} id="z-api-client-token" label="Client-Token" registration={register("clientToken")} />
            </FormSection>
          ) : (
            <FormSection
              description="Use o endereço do servidor e o token da instância, nunca o Admin Token."
              title="Credenciais Uazapi"
            >
              <FormField error={errors.baseUrl?.message} htmlFor="uazapi-base-url" label="URL do servidor">
                <Input className="font-mono" id="uazapi-base-url" placeholder="https://free.uazapi.com" {...register("baseUrl")} />
              </FormField>
              <SecretField error={errors.instanceToken?.message} id="uazapi-instance-token" label="Token da instância" registration={register("instanceToken")} />
            </FormSection>
          )}

          {feedback ? (
            <p className="rounded-[var(--radius-control)] border border-panel-border bg-panel-subtle px-3 py-2.5 text-sm text-muted-strong" role="status">
              {feedback}
            </p>
          ) : null}

          {pairing ? <PairingPanel pairing={pairing} /> : null}

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
                    {channel.authMethod === "pin" ? "Gerar código" : "Gerar QR Code"}
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

function SecretField({
  error,
  id,
  label,
  registration,
}: {
  error?: string;
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <FormField description="O valor não retorna para a interface depois de salvo." error={error} htmlFor={id} label={label}>
      <Input autoComplete="off" className="font-mono" id={id} type="password" {...registration} />
    </FormField>
  );
}

function ConnectionState({ channel }: { channel: ChannelConnection }) {
  const labels: Partial<Record<ChannelConnection["status"], string>> = {
    awaiting_pairing: "Aguardando pareamento",
    connected: "Conectado",
    connecting: "Conectando",
    draft: "Não configurado",
    failed: "Com falha",
  };
  return (
    <div className="rounded-[var(--radius-panel)] border border-panel-border bg-panel-subtle p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Estado operacional</p>
          <p className="mt-1 font-medium text-foreground">{labels[channel.status] ?? "Desconectado"}</p>
        </div>
        <span className={`size-2.5 rounded-full ${channel.status === "connected" ? "bg-success" : channel.status === "failed" ? "bg-danger" : "bg-warning"}`} />
      </div>
      {channel.statusReason ? <p className="mt-3 text-sm text-muted">{channel.statusReason}</p> : null}
    </div>
  );
}

function PairingPanel({ pairing }: { pairing: ChannelPairing }) {
  if (pairing.kind === "none") {
    return <p className="text-sm text-muted">Nenhum pareamento necessário neste momento.</p>;
  }
  if (pairing.kind === "code") {
    return (
      <div className="rounded-[var(--radius-panel)] border border-primary/25 bg-primary/5 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">Código de pareamento</p>
        <p className="mt-3 font-mono text-2xl font-semibold tracking-[0.18em] text-foreground">{pairing.value}</p>
      </div>
    );
  }
  return (
    <div className="rounded-[var(--radius-panel)] border border-primary/25 bg-white p-4">
      <Image alt="QR Code para conectar o WhatsApp" className="mx-auto size-64" height={256} src={pairing.value} unoptimized width={256} />
    </div>
  );
}
