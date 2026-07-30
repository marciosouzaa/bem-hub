import "server-only";

import type { ChannelProviderCredentials } from "@/features/channels/channel-provider-schema";
import type { ChannelProviderAdapter } from "@/features/channels/providers/channel-provider-adapter";
import {
  createWebhookEndpointToken,
  hashWebhookEndpointToken,
} from "@/features/channels/webhooks/endpoint-token";
import {
  ChannelWebhookIngressUnavailableError,
  reconcileProviderWebhook,
} from "@/features/channels/webhooks/webhook-ingress-health";
import { encryptSecret } from "@/lib/security/encryption";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

type StoredWebhookInput = {
  actorUserId: string;
  adapter: ChannelProviderAdapter;
  admin: AdminClient;
  channelId: string;
  credentials: ChannelProviderCredentials;
  organizationId: string;
};

export class ChannelWebhookPersistenceError extends Error {
  constructor() {
    super("Não foi possível salvar o estado do recebimento.");
    this.name = "ChannelWebhookPersistenceError";
  }
}

export async function configureNewChannelWebhook(
  input: StoredWebhookInput,
) {
  const endpointToken = createWebhookEndpointToken();
  const endpointId = await prepareWebhookEndpoint(input, endpointToken);

  try {
    const reconciliation = await reconcileProviderWebhook({
      adapter: input.adapter,
      endpointToken,
      provider: input.credentials.provider,
    });
    await persistWebhookEndpointToken(input, endpointToken);
    await activateWebhookEndpoint(input, endpointId);
    return reconciliation;
  } catch (error) {
    await markWebhookFailed(
      input,
      endpointId,
      error instanceof ChannelWebhookIngressUnavailableError
        ? "ingress_unreachable"
        : error instanceof ChannelWebhookPersistenceError
          ? "persistence_failed"
          : "provider_configuration_failed",
    );
    throw error;
  }
}

export async function reconcileStoredChannelWebhook(
  input: StoredWebhookInput,
) {
  const endpointToken = getStoredWebhookEndpointToken(input.credentials);
  if (!endpointToken || !input.adapter.configureWebhook) {
    return { handled: false, reconfigured: false };
  }

  const endpointId = await prepareWebhookEndpoint(input, endpointToken);
  try {
    const reconciliation = await reconcileProviderWebhook({
      adapter: input.adapter,
      endpointToken,
      provider: input.credentials.provider,
    });
    await activateWebhookEndpoint(input, endpointId);
    return { handled: true, reconfigured: reconciliation.reconfigured };
  } catch (error) {
    await markWebhookFailed(
      input,
      endpointId,
      error instanceof ChannelWebhookIngressUnavailableError
        ? "ingress_unreachable"
        : "provider_configuration_failed",
    );
    throw error;
  }
}

async function prepareWebhookEndpoint(
  input: StoredWebhookInput,
  endpointToken: string,
) {
  const now = new Date().toISOString();
  const { data, error } = await input.admin
    .from("channel_webhook_endpoints")
    .upsert({
      channel_connection_id: input.channelId,
      created_by: input.actorUserId,
      last_error_at: null,
      last_error_code: null,
      organization_id: input.organizationId,
      provider: input.credentials.provider,
      secret_hash: hashWebhookEndpointToken(endpointToken),
      status: "provisioning",
      updated_at: now,
    }, { onConflict: "channel_connection_id" })
    .select("id")
    .single();
  if (error || !data) throw new ChannelWebhookPersistenceError();
  return data.id;
}

async function activateWebhookEndpoint(
  input: StoredWebhookInput,
  endpointId: string,
) {
  const now = new Date().toISOString();
  const [{ error: endpointError }, { error: channelError }] = await Promise.all([
    input.admin
      .from("channel_webhook_endpoints")
      .update({
        configured_at: now,
        last_error_at: null,
        last_error_code: null,
        status: "active",
        updated_at: now,
      })
      .eq("id", endpointId)
      .eq("organization_id", input.organizationId),
    input.admin
      .from("channel_connections")
      .update({ webhook_configured_at: now })
      .eq("id", input.channelId)
      .eq("organization_id", input.organizationId),
  ]);
  if (endpointError || channelError) throw new ChannelWebhookPersistenceError();
}

async function persistWebhookEndpointToken(
  input: StoredWebhookInput,
  endpointToken: string,
) {
  if (
    input.credentials.provider !== "evolution"
    && input.credentials.provider !== "wuzapi"
  ) {
    return;
  }
  const encryptedCredentials = encryptSecret(JSON.stringify({
    ...input.credentials,
    webhookEndpointToken: endpointToken,
  }));
  const { error } = await input.admin
    .from("channel_credentials")
    .update({
      encrypted_credentials: encryptedCredentials,
      updated_at: new Date().toISOString(),
    })
    .eq("channel_connection_id", input.channelId)
    .eq("organization_id", input.organizationId);
  if (error) throw new ChannelWebhookPersistenceError();
}

async function markWebhookFailed(
  input: StoredWebhookInput,
  endpointId: string,
  errorCode: string,
) {
  const now = new Date().toISOString();
  await input.admin
    .from("channel_webhook_endpoints")
    .update({
      last_error_at: now,
      last_error_code: errorCode,
      status: "failed",
      updated_at: now,
    })
    .eq("id", endpointId)
    .eq("organization_id", input.organizationId);
}

function getStoredWebhookEndpointToken(
  credentials: ChannelProviderCredentials,
) {
  if (
    credentials.provider !== "evolution"
    && credentials.provider !== "wuzapi"
  ) {
    return null;
  }
  return credentials.webhookEndpointToken ?? null;
}
