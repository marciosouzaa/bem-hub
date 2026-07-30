"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useReducer } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { EntityDrawer } from "@/components/ui/entity-drawer";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import {
  provisionManagedChannelAction,
} from "@/features/channels/managed/managed-channel-actions";
import {
  createManagedChannelDrawerState,
  managedChannelDrawerReducer,
} from "@/features/channels/managed/managed-channel-drawer-state";
import {
  ManagedChannelOperations,
  ManagedChannelSecurityNote,
} from "@/features/channels/managed/managed-channel-panels";
import { ManagedChannelProgress } from "@/features/channels/managed/managed-channel-progress";
import { managedChannelInputSchema } from "@/features/channels/managed/managed-channel-schema";
import {
  refreshChannelProviderHealthAction,
  requestChannelPairingAction,
} from "@/features/channels/channel-provider-actions";
import { ChannelPairingPanel } from "@/features/channels/channel-provider-status-panels";
import type { ChannelConnection } from "@/features/channels/channel-schema";

const formId = "managed-channel-form";
const managedChannelNameSchema = managedChannelInputSchema.pick({ name: true });
type ManagedChannelNameValues = z.infer<typeof managedChannelNameSchema>;

type ManagedChannelDrawerProps = {
  channel: ChannelConnection | null;
  onClose: () => void;
  onSaved: () => void;
  open: boolean;
};

export function ManagedChannelDrawer({
  channel,
  onClose,
  onSaved,
  open,
}: ManagedChannelDrawerProps) {
  const [state, updateState] = useReducer(
    managedChannelDrawerReducer,
    channel,
    createManagedChannelDrawerState,
  );
  const {
    actionError,
    connectionId,
    feedback,
    operating,
    pairing,
    requestId,
    status,
  } = state;
  const {
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ManagedChannelNameValues>({
    defaultValues: { name: channel?.name ?? "" },
    resolver: zodResolver(managedChannelNameSchema),
  });

  useEffect(() => {
    const shouldPoll = open
      && connectionId
      && status !== "connected"
      && (pairing !== null || channel?.hasCredentials);
    if (!shouldPoll) return;

    let checking = false;
    const intervalId = window.setInterval(async () => {
      if (checking) return;
      checking = true;
      try {
        const result = await refreshChannelProviderHealthAction(connectionId);
        if (!result.ok || !result.status) return;
        updateState({ status: result.status });
        if (result.status === "connected") {
          updateState({
            feedback: "WhatsApp conectado e pronto para receber mensagens.",
            pairing: null,
          });
          onSaved();
          window.clearInterval(intervalId);
        }
      } finally {
        checking = false;
      }
    }, 3_000);

    return () => window.clearInterval(intervalId);
  }, [
    channel?.hasCredentials,
    connectionId,
    onSaved,
    open,
    pairing,
    status,
  ]);

  async function submit(values: ManagedChannelNameValues) {
    const stableRequestId = requestId || crypto.randomUUID();
    updateState({
      actionError: null,
      feedback: "Criando a conexão segura...",
      pairing: null,
      requestId: stableRequestId,
    });

    const result = await provisionManagedChannelAction({
      name: values.name,
      requestId: stableRequestId,
    });
    if (!result.ok) {
      updateState({ actionError: result.message, feedback: null });
      return;
    }

    updateState({
      connectionId: result.channelId,
      feedback: result.message,
      pairing: result.pairing ?? null,
      status: result.status,
    });
    reset(values);
    onSaved();

    if (
      !result.pairing
      && ["awaiting_pairing", "connecting", "disconnected"].includes(result.status)
    ) {
      await requestPairing(result.channelId);
    }
  }

  async function requestPairing(targetConnectionId = connectionId) {
    if (!targetConnectionId) return;
    updateState({ actionError: null, operating: true });
    try {
      const result = await requestChannelPairingAction(targetConnectionId);
      if (!result.ok) {
        updateState({ actionError: result.message });
        return;
      }
      updateState({
        feedback: result.message,
        pairing: result.pairing ?? null,
        ...(result.status ? { status: result.status } : {}),
      });
      onSaved();
    } finally {
      updateState({ operating: false });
    }
  }

  async function refreshStatus() {
    if (!connectionId) return;
    updateState({ actionError: null, operating: true });
    try {
      const result = await refreshChannelProviderHealthAction(connectionId);
      if (!result.ok) {
        updateState({ actionError: result.message });
        return;
      }
      updateState({
        feedback: result.message,
        ...(result.status ? { status: result.status } : {}),
        ...(result.status === "connected" ? { pairing: null } : {}),
      });
      onSaved();
    } finally {
      updateState({ operating: false });
    }
  }

  function closeDrawer() {
    updateState({ actionError: null, feedback: null, pairing: null });
    onClose();
  }

  const connected = status === "connected";
  const hasPreparedInstance = Boolean(connectionId)
    && !["draft", "provisioning", "failed"].includes(status);

  return (
    <EntityDrawer
      description="Dê um nome ao canal e leia o QR Code. A configuração técnica acontece internamente."
      formId={formId}
      isDirty={isDirty}
      isSubmitting={isSubmitting || operating}
      onClose={closeDrawer}
      open={open}
      saveDisabled={connected}
      saveLabel={channel ? "Retomar conexão" : "Preparar QR Code"}
      size="md"
      submittingLabel="Preparando..."
      title={channel ? `Conectar ${channel.name}` : "Novo canal de WhatsApp"}
    >
      <form className="space-y-7" id={formId} onSubmit={handleSubmit(submit)}>
        <ManagedChannelProgress
          connected={connected}
          hasPreparedInstance={hasPreparedInstance}
        />

        <FormSection
          description="Use algo reconhecível pela equipe, como “Comercial” ou “Suporte”."
          title="Identificação"
        >
          <FormField
            error={errors.name?.message}
            htmlFor="managed-channel-name"
            label="Nome do canal"
          >
            <Input
              aria-invalid={Boolean(errors.name)}
              autoFocus
              disabled={Boolean(channel)}
              id="managed-channel-name"
              placeholder="WhatsApp comercial"
              {...register("name")}
            />
          </FormField>
        </FormSection>

        {feedback ? (
          <p
            className="rounded-[var(--radius-control)] border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-muted-strong"
            role="status"
          >
            {feedback}
          </p>
        ) : null}

        {actionError ? (
          <p
            className="rounded-[var(--radius-control)] border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm text-danger"
            role="alert"
          >
            {actionError}
          </p>
        ) : null}

        {pairing ? (
          <FormSection
            description="No WhatsApp, abra Aparelhos conectados e escolha Conectar um aparelho."
            title="Leia o QR Code"
          >
            <ChannelPairingPanel pairing={pairing} />
          </FormSection>
        ) : null}

        <ManagedChannelOperations
          connected={connected}
          hasPreparedInstance={Boolean(connectionId) && hasPreparedInstance}
          onRefresh={refreshStatus}
          onRequestPairing={() => requestPairing()}
          operating={operating}
        />

        <ManagedChannelSecurityNote />
      </form>
    </EntityDrawer>
  );
}
