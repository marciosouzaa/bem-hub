"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, Radio, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ChannelConnection } from "@/features/channels/channel-schema";
import { normalizeContactPhone } from "@/features/contacts/phone-normalization";
import {
  canStartSupportConversation,
  supportConversationStartFormSchema,
  type SupportConversationStartFormValues,
} from "@/features/support/start-support-conversation-contracts";

const formId = "support-start-form";

type SupportStartDrawerProps = {
  channels: ChannelConnection[];
  onClose: () => void;
  open: boolean;
};

export function SupportStartDrawer({
  channels,
  onClose,
  open,
}: SupportStartDrawerProps) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const availableChannels = useMemo(
    () => channels.filter(canStartSupportConversation),
    [channels],
  );
  const {
    control,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<SupportConversationStartFormValues>({
    defaultValues: getDefaultValues(availableChannels),
    resolver: zodResolver(supportConversationStartFormSchema),
  });
  const phone = useWatch({ control, name: "contactPhone" });
  const phoneResult = normalizeContactPhone(phone);

  useEffect(() => {
    if (!open) return;
    reset(getDefaultValues(availableChannels));
  }, [availableChannels, open, reset]);

  function closeDrawer() {
    setActionError(null);
    onClose();
  }

  async function submit(values: SupportConversationStartFormValues) {
    setActionError(null);
    const response = await fetch("/api/support/conversations", {
      body: JSON.stringify({
        ...values,
        clientRequestId: crypto.randomUUID(),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = await readResponse(response);

    if (!response.ok && !payload.conversationId) {
      setActionError(payload.message);
      return;
    }

    if (!payload.conversationId) {
      setActionError("Atendimento iniciado, mas não foi possível abri-lo.");
      return;
    }

    reset(values);
    closeDrawer();
    router.push(`/app/support/${payload.conversationId}`);
    router.refresh();
  }

  return (
    <EntityDrawer
      description="Escolha o canal, identifique o contato e envie a primeira mensagem."
      formId={formId}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={closeDrawer}
      open={open}
      saveDisabled={!availableChannels.length}
      saveLabel="Iniciar atendimento"
      submittingLabel="Enviando..."
      title="Iniciar atendimento"
    >
      <form className="space-y-7" id={formId} onSubmit={handleSubmit(submit)}>
        {!availableChannels.length ? (
          <div className="rounded-[var(--radius-card)] border border-warning/25 bg-warning/5 p-4">
            <div className="flex items-start gap-3">
              <Radio aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Nenhum canal conectado
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Conecte Evolution API, Wuzapi ou outro canal com envio ativo.
                </p>
              </div>
            </div>
            <Button asChild className="mt-4" size="sm" variant="outline">
              <Link href="/app/channels">Abrir canais</Link>
            </Button>
          </div>
        ) : null}

        <FormSection
          description="Mensagem sai pelo número conectado e permanece na mesma conversa quando o contato responder."
          title="Canal de saída"
        >
          <FormField
            error={errors.channelConnectionId?.message}
            htmlFor="support-start-channel"
            label="Canal"
          >
            <Select
              aria-invalid={Boolean(errors.channelConnectionId)}
              disabled={!availableChannels.length}
              id="support-start-channel"
              {...register("channelConnectionId")}
            >
              {!availableChannels.length ? (
                <option value="">Nenhum canal disponível</option>
              ) : null}
              {availableChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name} · {providerLabel(channel.provider)} ·{" "}
                  {channel.phoneNumber ?? "Número não identificado"}
                </option>
              ))}
            </Select>
          </FormField>
        </FormSection>

        <FormSection
          description="Contato existente será reutilizado pela identidade telefônica; novo número cria contato automaticamente."
          title="Contato"
        >
          <FormField
            description="Sem +DDI, número será tratado como brasileiro."
            error={errors.contactPhone?.message}
            htmlFor="support-start-phone"
            label="Telefone"
          >
            <Input
              aria-invalid={Boolean(errors.contactPhone)}
              autoFocus
              id="support-start-phone"
              inputMode="tel"
              maxLength={30}
              placeholder="+55 21 99676-3611"
              {...register("contactPhone")}
            />
          </FormField>
          {phone && phoneResult.status === "supported" ? (
            <PhoneFeedback
              icon={<CheckCircle2 aria-hidden="true" className="size-3.5" />}
              text="Telefone validado e pronto para envio."
              tone="success"
            />
          ) : phone && phoneResult.status === "unsupported_country" ? (
            <PhoneFeedback
              icon={<AlertTriangle aria-hidden="true" className="size-3.5" />}
              text="DDI preservado. Confirme se este canal alcança o país informado."
              tone="warning"
            />
          ) : null}
          <FormField
            error={errors.contactName?.message}
            htmlFor="support-start-name"
            label="Nome"
            optional
          >
            <Input
              aria-invalid={Boolean(errors.contactName)}
              id="support-start-name"
              maxLength={200}
              placeholder="Nome da pessoa ou empresa"
              {...register("contactName")}
            />
          </FormField>
        </FormSection>

        <FormSection title="Primeira mensagem">
          <FormField
            error={errors.message?.message}
            htmlFor="support-start-message"
            label="Mensagem"
          >
            <Textarea
              aria-invalid={Boolean(errors.message)}
              id="support-start-message"
              maxLength={10_000}
              placeholder="Olá! Como posso ajudar?"
              {...register("message")}
            />
          </FormField>
          <p className="flex items-center gap-2 text-xs text-muted">
            <Send aria-hidden="true" className="size-3.5" />
            Envio direto. Falhas ficam no histórico com opção de retry.
          </p>
        </FormSection>

        {actionError ? (
          <p
            className="rounded-[var(--radius-control)] border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm text-danger"
            role="alert"
          >
            {actionError}
          </p>
        ) : null}
      </form>
    </EntityDrawer>
  );
}

function getDefaultValues(
  channels: ChannelConnection[],
): SupportConversationStartFormValues {
  return {
    channelConnectionId: channels[0]?.id ?? "",
    contactName: "",
    contactPhone: "",
    message: "",
  };
}

function providerLabel(provider: string) {
  if (provider === "evolution") return "Evolution API";
  if (provider === "wuzapi") return "Wuzapi";
  if (provider === "uazapi") return "Uazapi";
  if (provider === "z_api") return "Z-API";
  return provider;
}

function PhoneFeedback({
  icon,
  text,
  tone,
}: {
  icon: React.ReactNode;
  text: string;
  tone: "success" | "warning";
}) {
  return (
    <p
      className={tone === "success"
        ? "flex items-center gap-2 rounded-[var(--radius-control)] border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-muted-strong [&>svg]:text-primary"
        : "flex items-center gap-2 rounded-[var(--radius-control)] border border-warning/25 bg-warning/5 px-3 py-2.5 text-xs text-muted-strong [&>svg]:text-warning"}
    >
      {icon}
      {text}
    </p>
  );
}

async function readResponse(response: Response) {
  const payload = await response.json().catch(() => null) as {
    conversationId?: string | null;
    message?: string;
  } | null;
  return {
    conversationId: payload?.conversationId ?? null,
    message: payload?.message ?? "Não foi possível iniciar o atendimento.",
  };
}
