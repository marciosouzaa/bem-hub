"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  channelProviderCredentialsSchema,
  configurableChannelProviderSchema,
  type ChannelProviderCredentials,
  type ChannelProviderStatus,
} from "@/features/channels/channel-provider-schema";
import {
  getManagedWuzapiConfig,
} from "@/features/channels/managed/managed-channel-config";
import type {
  ChannelPairing,
  ChannelProviderHealth,
} from "@/features/channels/providers/channel-provider-adapter";
import { ChannelProviderRequestError } from "@/features/channels/providers/provider-http";
import { resolveChannelProvider } from "@/features/channels/providers/resolve-channel-provider";
import { createManagedWuzapiProvisioner } from "@/features/channels/providers/wuzapi/wuzapi-managed-provisioner";
import {
  ChannelWebhookIngressUnavailableError,
} from "@/features/channels/webhooks/webhook-ingress-health";
import {
  configureNewChannelWebhook,
  ChannelWebhookPersistenceError,
  reconcileStoredChannelWebhook,
} from "@/features/channels/webhooks/reconcile-stored-channel-webhook";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import {
  AppBaseUrlConfigError,
} from "@/lib/app-url";
import {
  decryptSecret,
  encryptSecret,
  EncryptionConfigError,
} from "@/lib/security/encryption";
import {
  createSupabaseAdminClient,
  SupabaseAdminConfigError,
} from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const channelsPath = "/app/channels";
const missingSchemaMessage =
  "A estrutura segura de conexões de canais ainda não foi aplicada no banco.";

export type ChannelProviderActionResult =
  | {
      ok: true;
      message: string;
      pairing?: ChannelPairing;
      status?: ChannelProviderStatus;
    }
  | { ok: false; message: string };

export async function configureChannelProviderAction(
  connectionId: string,
  input: unknown,
): Promise<ChannelProviderActionResult> {
  const id = z.string().uuid().safeParse(connectionId);
  const credentials = channelProviderCredentialsSchema.safeParse(input);
  if (!id.success || !credentials.success) {
    return { ok: false, message: "Revise as credenciais informadas." };
  }
  if (!configurableChannelProviderSchema.safeParse(credentials.data.provider).success) {
    return {
      ok: false,
      message: "Novas configurações Z-API estão pausadas. Escolha outro provedor.",
    };
  }

  const context = await getChannelAdminContext(id.data);
  if (!context.ok) return context.result;

  try {
    const adapter = resolveChannelProvider(credentials.data);
    await adapter.provision?.();
    const health = await adapter.getHealth();
    const encryptedCredentials = encryptSecret(JSON.stringify(credentials.data));
    const { error } = await context.admin.rpc("save_channel_provider_configuration", {
      actor_user_id: context.workspace.user.id,
      configured_base_url: getProviderBaseUrl(credentials.data),
      configured_external_instance_id: health.externalInstanceId ?? "",
      configured_provider: credentials.data.provider,
      encrypted_provider_credentials: encryptedCredentials,
      provider_status: health.status,
      provider_status_reason: health.reason ?? "",
      target_connection_id: context.channel.id,
      target_organization_id: context.workspace.organization.id,
    });
    if (error) return databaseErrorResult(error);

    revalidatePath(channelsPath);
    return {
      ok: true,
      message: health.status === "connected"
        ? "Credenciais validadas. Número conectado."
        : "Credenciais validadas. Falta conectar o número.",
      status: health.status,
    };
  } catch (error) {
    return providerErrorResult(error);
  }
}

export async function refreshChannelProviderHealthAction(
  connectionId: string,
): Promise<ChannelProviderActionResult> {
  const loaded = await loadStoredProvider(connectionId);
  if (!loaded.ok) return loaded.result;

  try {
    const health = await loaded.adapter.getHealth();
    const phoneNumber = await resolveManagedPhoneNumber(loaded, health);
    if (health.status === "connected") {
      try {
        await reconcileStoredChannelWebhook(toStoredWebhookInput(loaded));
      } catch (error) {
        await persistHealth(
          loaded,
          "degraded",
          "Sessão conectada, mas o recebimento de mensagens está indisponível.",
          health.externalInstanceId,
          phoneNumber,
        );
        return providerErrorResult(error);
      }
    }
    const result = await persistHealth(
      loaded,
      health.status,
      health.reason,
      health.externalInstanceId,
      phoneNumber,
    );
    if (!result.ok) return result;
    return {
      ok: true,
      message: health.status === "connected" ? "Conexão ativa." : "Estado da conexão atualizado.",
      status: health.status,
    };
  } catch (error) {
    return providerErrorResult(error);
  }
}

export async function configureChannelWebhookAction(
  connectionId: string,
): Promise<ChannelProviderActionResult> {
  const loaded = await loadStoredProvider(connectionId);
  if (!loaded.ok) return loaded.result;
  if (!loaded.adapter.configureWebhook) {
    return {
      ok: false,
      message: "O recebimento deste provedor ainda não está disponível.",
    };
  }

  try {
    await configureNewChannelWebhook(toStoredWebhookInput(loaded));
    revalidatePath(channelsPath);
    return {
      ok: true,
      message: "Recebimento ativado. Envie uma mensagem para validar a entrada.",
    };
  } catch (error) {
    return providerErrorResult(error);
  }
}

export async function requestChannelPairingAction(
  connectionId: string,
): Promise<ChannelProviderActionResult> {
  const loaded = await loadStoredProvider(connectionId);
  if (!loaded.ok) return loaded.result;

  try {
    const pairing = await loaded.adapter.requestPairing({
      method: loaded.channel.auth_method === "pin" ? "pin" : "qr",
      phoneNumber: loaded.channel.phone_number ?? "",
    });
    const health = pairing.kind === "none" ? await loaded.adapter.getHealth() : null;
    const phoneNumber = health
      ? await resolveManagedPhoneNumber(loaded, health)
      : null;
    const status = health?.status ?? "awaiting_pairing";
    const reason = health?.reason ?? "Aguardando autenticação no WhatsApp.";
    const result = await persistHealth(
      loaded,
      status,
      reason,
      health?.externalInstanceId ?? null,
      phoneNumber,
    );
    if (!result.ok) return result;
    return {
      ok: true,
      message: pairing.kind === "none"
        ? "Número já conectado ou pareamento ainda indisponível."
        : "Pareamento solicitado.",
      pairing,
      status,
    };
  } catch (error) {
    return providerErrorResult(error);
  }
}

export async function disconnectChannelProviderAction(
  connectionId: string,
): Promise<ChannelProviderActionResult> {
  const loaded = await loadStoredProvider(connectionId);
  if (!loaded.ok) return loaded.result;

  try {
    await loaded.adapter.disconnect();
    const result = await persistHealth(
      loaded,
      "disconnected",
      "Número desconectado pelo administrador.",
      null,
    );
    if (!result.ok) return result;
    return { ok: true, message: "Número desconectado.", status: "disconnected" };
  } catch (error) {
    return providerErrorResult(error);
  }
}

async function resolveManagedPhoneNumber(
  loaded: Extract<Awaited<ReturnType<typeof loadStoredProvider>>, { ok: true }>,
  health: ChannelProviderHealth,
) {
  if (health.phoneNumber) return health.phoneNumber;
  if (
    health.status !== "connected"
    || loaded.channel.management_mode !== "managed"
    || loaded.credentials.provider !== "wuzapi"
  ) {
    return null;
  }

  try {
    return await createManagedWuzapiProvisioner(
      getManagedWuzapiConfig(),
    ).getPhoneNumber({
      externalInstanceId: health.externalInstanceId,
      token: loaded.credentials.userToken,
    });
  } catch {
    return null;
  }
}

async function getChannelAdminContext(connectionId: string) {
  const workspace = await getRequiredWorkspace();
  if (!canManage(workspace.membership.role)) {
    return {
      ok: false as const,
      result: { ok: false as const, message: "Sem permissão para gerenciar conexões." },
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: channel, error } = await supabase
    .from("channel_connections")
    .select("id,auth_method,kind,management_mode,phone_number,provider")
    .eq("id", connectionId)
    .eq("organization_id", workspace.organization.id)
    .maybeSingle();

  if (error || !channel) {
    return {
      ok: false as const,
      result: { ok: false as const, message: "Canal não encontrado nesta organização." },
    };
  }
  if (channel.kind !== "unofficial") {
    return {
      ok: false as const,
      result: { ok: false as const, message: "Este adapter atende somente canais não oficiais." },
    };
  }

  try {
    return {
      admin: createSupabaseAdminClient(),
      channel,
      ok: true as const,
      workspace,
    };
  } catch (adminError) {
    return {
      ok: false as const,
      result: providerErrorResult(adminError),
    };
  }
}

async function loadStoredProvider(connectionId: string) {
  const id = z.string().uuid().safeParse(connectionId);
  if (!id.success) {
    return {
      ok: false as const,
      result: { ok: false as const, message: "Canal inválido." },
    };
  }
  const context = await getChannelAdminContext(id.data);
  if (!context.ok) return context;

  const { data: stored, error } = await context.admin
    .from("channel_credentials")
    .select("encrypted_credentials")
    .eq("channel_connection_id", context.channel.id)
    .eq("organization_id", context.workspace.organization.id)
    .maybeSingle();

  if (error) {
    return { ok: false as const, result: databaseErrorResult(error) };
  }
  if (!stored) {
    return {
      ok: false as const,
      result: { ok: false as const, message: "Configure as credenciais deste canal primeiro." },
    };
  }

  try {
    const credentials = channelProviderCredentialsSchema.parse(
      JSON.parse(decryptSecret(stored.encrypted_credentials)),
    );
    return {
      ...context,
      adapter: resolveChannelProvider(credentials),
      credentials,
      ok: true as const,
    };
  } catch (error) {
    return { ok: false as const, result: providerErrorResult(error) };
  }
}

async function persistHealth(
  loaded: Extract<Awaited<ReturnType<typeof loadStoredProvider>>, { ok: true }>,
  status: ChannelProviderStatus,
  reason: string | null,
  externalInstanceId: string | null,
  phoneNumber: string | null = null,
): Promise<ChannelProviderActionResult> {
  const { error } = await loaded.admin.rpc("update_channel_provider_health", {
    configured_external_instance_id: externalInstanceId ?? "",
    provider_status: status,
    provider_status_reason: reason ?? "",
    target_connection_id: loaded.channel.id,
    target_organization_id: loaded.workspace.organization.id,
  });
  if (error) return databaseErrorResult(error);
  if (phoneNumber) {
    const { error: phoneError } = await loaded.admin
      .from("channel_connections")
      .update({ phone_number: phoneNumber })
      .eq("id", loaded.channel.id)
      .eq("organization_id", loaded.workspace.organization.id);
    if (phoneError) return databaseErrorResult(phoneError);
  }
  if (loaded.channel.management_mode === "managed" && status === "connected") {
    const now = new Date().toISOString();
    await loaded.admin
      .from("channel_provisioning_runs")
      .update({
        finished_at: now,
        lease_expires_at: null,
        status: "succeeded",
        step: "connected",
        updated_at: now,
      })
      .eq("channel_connection_id", loaded.channel.id)
      .eq("organization_id", loaded.workspace.organization.id)
      .in("status", ["queued", "in_progress", "awaiting_pairing"]);
  }
  revalidatePath(channelsPath);
  return { ok: true, message: "Estado atualizado.", status };
}

function toStoredWebhookInput(
  loaded: Extract<Awaited<ReturnType<typeof loadStoredProvider>>, { ok: true }>,
) {
  return {
    actorUserId: loaded.workspace.user.id,
    adapter: loaded.adapter,
    admin: loaded.admin,
    channelId: loaded.channel.id,
    credentials: loaded.credentials,
    organizationId: loaded.workspace.organization.id,
  };
}

function getProviderBaseUrl(credentials: ChannelProviderCredentials) {
  return credentials.provider === "z_api"
    ? "https://api.z-api.io"
    : credentials.baseUrl;
}

function providerErrorResult(error: unknown): ChannelProviderActionResult {
  if (error instanceof ChannelProviderRequestError) {
    return { ok: false, message: error.message };
  }
  if (error instanceof EncryptionConfigError) {
    return { ok: false, message: "APP_ENCRYPTION_KEY não configurada." };
  }
  if (error instanceof SupabaseAdminConfigError) {
    return {
      ok: false,
      message: "SUPABASE_SECRET_KEY não configurada para operações de canal.",
    };
  }
  if (error instanceof AppBaseUrlConfigError) {
    return {
      ok: false,
      message: "APP_BASE_URL não configurada para receber webhooks.",
    };
  }
  if (error instanceof ChannelWebhookIngressUnavailableError) {
    return {
      ok: false,
      message:
        "O WhatsApp está conectado, mas o endereço público de recebimento não responde.",
    };
  }
  if (error instanceof ChannelWebhookPersistenceError) {
    return {
      ok: false,
      message: "Não foi possível salvar o estado do recebimento.",
    };
  }
  if (error instanceof z.ZodError || error instanceof SyntaxError) {
    return { ok: false, message: "O provedor retornou dados incompatíveis." };
  }
  return { ok: false, message: "Não foi possível operar esta conexão." };
}

function databaseErrorResult(error: { code?: string; message: string }) {
  const missingSchema = error.code === "42P01" || error.message.includes("schema cache");
  return {
    ok: false as const,
    message: missingSchema ? missingSchemaMessage : "Não foi possível salvar o estado da conexão.",
  };
}

function canManage(role: string) {
  return role === "owner" || role === "admin";
}
