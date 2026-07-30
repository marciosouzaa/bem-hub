import "server-only";

import { randomBytes } from "crypto";
import { z } from "zod";

import { ManagedProvisioningDatabaseError } from "@/features/channels/managed/managed-channel-errors";
import { wuzapiCredentialsSchema } from "@/features/channels/channel-provider-schema";
import {
  createWebhookEndpointToken,
  hashWebhookEndpointToken,
} from "@/features/channels/webhooks/endpoint-token";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ManagedWuzapiCredentials =
  z.infer<typeof wuzapiCredentialsSchema> & {
    webhookEndpointToken: string;
  };

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export async function ensureManagedCredentials(input: {
  actorUserId: string;
  admin: AdminClient;
  baseUrl: string;
  channelId: string;
  organizationId: string;
}): Promise<ManagedWuzapiCredentials> {
  const { data: stored, error: storedError } = await input.admin
    .from("channel_credentials")
    .select("encrypted_credentials")
    .eq("channel_connection_id", input.channelId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (storedError) throw new ManagedProvisioningDatabaseError();

  if (stored) {
    const existing = wuzapiCredentialsSchema.parse(
      JSON.parse(decryptSecret(stored.encrypted_credentials)),
    );
    if (existing.webhookEndpointToken) {
      return {
        ...existing,
        webhookEndpointToken: existing.webhookEndpointToken,
      };
    }
  }

  const credentials = createCredentials(input.baseUrl);
  const { error } = await input.admin.rpc("save_channel_provider_configuration", {
    actor_user_id: input.actorUserId,
    configured_base_url: credentials.baseUrl,
    configured_external_instance_id: "",
    configured_provider: "wuzapi",
    encrypted_provider_credentials: encryptSecret(JSON.stringify(credentials)),
    provider_status: "provisioning",
    provider_status_reason: "Credenciais internas protegidas. Criando a instância.",
    target_connection_id: input.channelId,
    target_organization_id: input.organizationId,
  });
  if (error) throw new ManagedProvisioningDatabaseError();
  return credentials;
}

export async function ensureManagedWebhookEndpoint(input: {
  actorUserId: string;
  admin: AdminClient;
  channelId: string;
  endpointToken: string;
  organizationId: string;
}) {
  const now = new Date().toISOString();
  const { data, error } = await input.admin
    .from("channel_webhook_endpoints")
    .upsert({
      channel_connection_id: input.channelId,
      created_by: input.actorUserId,
      last_error_at: null,
      last_error_code: null,
      organization_id: input.organizationId,
      provider: "wuzapi",
      secret_hash: hashWebhookEndpointToken(input.endpointToken),
      status: "provisioning",
      updated_at: now,
    }, { onConflict: "channel_connection_id" })
    .select("id")
    .single();
  if (error || !data) throw new ManagedProvisioningDatabaseError();
  return data.id;
}

function createCredentials(baseUrl: string): ManagedWuzapiCredentials {
  return {
    baseUrl,
    provider: "wuzapi",
    userToken: randomBytes(32).toString("base64url"),
    webhookEndpointToken: createWebhookEndpointToken(),
    webhookHmacKey: randomBytes(48).toString("base64url"),
  };
}
