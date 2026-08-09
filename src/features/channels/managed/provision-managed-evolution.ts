import "server-only";

import type { ManagedEvolutionConfig } from "@/features/channels/managed/managed-channel-config";
import type {
  ManagedChannelActionResult,
  ManagedChannelRegistration,
} from "@/features/channels/managed/managed-channel-contracts";
import {
  ManagedProvisioningDatabaseError,
  managedProvisioningErrorResult,
} from "@/features/channels/managed/managed-channel-errors";
import {
  finishManagedProvisioningRun,
  markManagedProvisioningFailed,
  updateManagedRunStep,
} from "@/features/channels/managed/managed-channel-run-store";
import { createEvolutionAdapter } from "@/features/channels/providers/evolution/evolution-adapter";
import {
  createWebhookEndpointToken,
  hashWebhookEndpointToken,
} from "@/features/channels/webhooks/endpoint-token";
import { assertWebhookIngressReachable } from "@/features/channels/webhooks/webhook-ingress-health";
import { getAppBaseUrl } from "@/lib/app-url";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

type ManagedEvolutionCredentials = {
  apiKey: string;
  baseUrl: string;
  instanceName: string;
  provider: "evolution";
  webhookEndpointToken: string;
};

export async function provisionManagedEvolution(input: {
  actorUserId: string;
  admin: AdminClient;
  config: ManagedEvolutionConfig;
  organizationId: string;
  registration: ManagedChannelRegistration;
}): Promise<ManagedChannelActionResult> {
  try {
    return await runProvisioning(input);
  } catch (error) {
    const result = managedProvisioningErrorResult(error);
    await markManagedProvisioningFailed({
      admin: input.admin,
      channelId: input.registration.channelId,
      error,
      message: result.message,
      organizationId: input.organizationId,
      runId: input.registration.runId,
    });
    return result;
  }
}

async function runProvisioning(input: {
  actorUserId: string;
  admin: AdminClient;
  config: ManagedEvolutionConfig;
  organizationId: string;
  registration: ManagedChannelRegistration;
}): Promise<ManagedChannelActionResult> {
  const channelId = input.registration.channelId;
  const runId = input.registration.runId;
  const credentials = await ensureManagedEvolutionCredentials({
    ...input,
    channelId,
  });
  const webhookUrl =
    `${getAppBaseUrl()}/api/webhooks/channels/evolution/${credentials.webhookEndpointToken}`;
  await assertWebhookIngressReachable();
  const endpointId = await ensureManagedWebhookEndpoint({
    actorUserId: input.actorUserId,
    admin: input.admin,
    channelId,
    endpointToken: credentials.webhookEndpointToken,
    organizationId: input.organizationId,
  });

  await updateManagedRunStep({
    admin: input.admin,
    organizationId: input.organizationId,
    runId,
    step: "creating_instance",
  });
  const adapter = createEvolutionAdapter(credentials);
  await adapter.provision?.();
  const health = await adapter.getHealth();
  await saveProviderState({
    ...input,
    channelId,
    externalInstanceId: health.externalInstanceId ?? credentials.instanceName,
    reason: health.reason ?? "Instância preparada. Gerando o QR Code.",
    status: health.status,
  }, credentials);

  await updateManagedRunStep({
    admin: input.admin,
    organizationId: input.organizationId,
    runId,
    step: "configuring_webhook",
  });
  await adapter.configureWebhook?.({ url: webhookUrl });
  await activateWebhook({
    admin: input.admin,
    channelId,
    endpointId,
    organizationId: input.organizationId,
  });

  await updateManagedRunStep({
    admin: input.admin,
    organizationId: input.organizationId,
    runId,
    step: "requesting_pairing",
  });
  const pairing = await adapter.requestPairing({ method: "qr", phoneNumber: "" });
  const pairedHealth = pairing.kind === "none" ? await adapter.getHealth() : null;
  const status = pairedHealth?.status ?? "awaiting_pairing";
  await saveProviderState({
    ...input,
    channelId,
    externalInstanceId: pairedHealth?.externalInstanceId ?? health.externalInstanceId ?? credentials.instanceName,
    reason: pairedHealth?.reason ?? "Leia o QR Code com o WhatsApp.",
    status,
  }, credentials);
  await finishManagedProvisioningRun({
    admin: input.admin,
    organizationId: input.organizationId,
    runId,
    status,
  });

  return {
    channelId,
    message: status === "connected"
      ? "WhatsApp conectado."
      : "Instância pronta. Leia o QR Code para conectar.",
    ok: true,
    pairing,
    runId,
    status,
  };
}

async function ensureManagedEvolutionCredentials(input: {
  actorUserId: string;
  admin: AdminClient;
  channelId: string;
  config: ManagedEvolutionConfig;
  organizationId: string;
}) {
  const { data: stored, error } = await input.admin
    .from("channel_credentials")
    .select("encrypted_credentials")
    .eq("channel_connection_id", input.channelId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (error) throw new ManagedProvisioningDatabaseError();

  if (stored) {
    const existing = JSON.parse(decryptSecret(stored.encrypted_credentials)) as Partial<ManagedEvolutionCredentials>;
    if (existing.provider === "evolution" && existing.webhookEndpointToken) {
      return {
        apiKey: input.config.apiKey,
        baseUrl: input.config.baseUrl,
        instanceName: existing.instanceName ?? createInstanceName(input.organizationId, input.channelId),
        provider: "evolution" as const,
        webhookEndpointToken: existing.webhookEndpointToken,
      };
    }
  }

  const credentials: ManagedEvolutionCredentials = {
    apiKey: input.config.apiKey,
    baseUrl: input.config.baseUrl,
    instanceName: createInstanceName(input.organizationId, input.channelId),
    provider: "evolution",
    webhookEndpointToken: createWebhookEndpointToken(),
  };
  await saveProviderState({
    ...input,
    externalInstanceId: credentials.instanceName,
    reason: "Credenciais internas protegidas. Criando a instância.",
    status: "provisioning",
  }, credentials);
  return credentials;
}

function createInstanceName(organizationId: string, channelId: string) {
  return `bemhub-${organizationId.slice(0, 8)}-${channelId.slice(0, 8)}`;
}

async function saveProviderState(
  input: {
    actorUserId: string;
    admin: AdminClient;
    channelId: string;
    externalInstanceId: string;
    organizationId: string;
    reason: string;
    status: string;
  },
  credentials: ManagedEvolutionCredentials,
) {
  const { error } = await input.admin.rpc("save_channel_provider_configuration", {
    actor_user_id: input.actorUserId,
    configured_base_url: credentials.baseUrl,
    configured_external_instance_id: input.externalInstanceId,
    configured_provider: "evolution",
    encrypted_provider_credentials: encryptSecret(JSON.stringify(credentials)),
    provider_status: input.status,
    provider_status_reason: input.reason,
    target_connection_id: input.channelId,
    target_organization_id: input.organizationId,
  });
  if (error) throw new ManagedProvisioningDatabaseError();
}

async function ensureManagedWebhookEndpoint(input: {
  actorUserId: string;
  admin: AdminClient;
  channelId: string;
  endpointToken: string;
  organizationId: string;
}) {
  const { data, error } = await input.admin
    .from("channel_webhook_endpoints")
    .upsert({
      channel_connection_id: input.channelId,
      created_by: input.actorUserId,
      organization_id: input.organizationId,
      provider: "evolution",
      secret_hash: hashWebhookEndpointToken(input.endpointToken),
      status: "provisioning",
      updated_at: new Date().toISOString(),
    }, { onConflict: "channel_connection_id" })
    .select("id")
    .single();
  if (error || !data) throw new ManagedProvisioningDatabaseError();
  return data.id;
}

async function activateWebhook(input: {
  admin: AdminClient;
  channelId: string;
  endpointId: string;
  organizationId: string;
}) {
  const now = new Date().toISOString();
  const [{ error: endpointError }, { error: channelError }] = await Promise.all([
    input.admin
      .from("channel_webhook_endpoints")
      .update({ configured_at: now, status: "active", updated_at: now })
      .eq("id", input.endpointId)
      .eq("organization_id", input.organizationId),
    input.admin
      .from("channel_connections")
      .update({ webhook_configured_at: now })
      .eq("id", input.channelId)
      .eq("organization_id", input.organizationId),
  ]);
  if (endpointError || channelError) throw new ManagedProvisioningDatabaseError();
}
