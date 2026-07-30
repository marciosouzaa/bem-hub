import "server-only";

import type { ManagedWuzapiConfig } from "@/features/channels/managed/managed-channel-config";
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
import {
  ensureManagedCredentials,
  ensureManagedWebhookEndpoint,
} from "@/features/channels/managed/managed-channel-secrets";
import { createWuzapiAdapter } from "@/features/channels/providers/wuzapi/wuzapi-adapter";
import {
  createManagedWuzapiInstanceName,
  createManagedWuzapiProvisioner,
} from "@/features/channels/providers/wuzapi/wuzapi-managed-provisioner";
import { assertWebhookIngressReachable } from "@/features/channels/webhooks/webhook-ingress-health";
import { getAppBaseUrl } from "@/lib/app-url";
import { encryptSecret } from "@/lib/security/encryption";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export async function provisionManagedWuzapi(input: {
  actorUserId: string;
  admin: AdminClient;
  config: ManagedWuzapiConfig;
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
  config: ManagedWuzapiConfig;
  organizationId: string;
  registration: ManagedChannelRegistration;
}): Promise<ManagedChannelActionResult> {
  const channelId = input.registration.channelId;
  const runId = input.registration.runId;
  const credentials = await ensureManagedCredentials({
    actorUserId: input.actorUserId,
    admin: input.admin,
    baseUrl: input.config.baseUrl,
    channelId,
    organizationId: input.organizationId,
  });
  const webhookUrl =
    `${getAppBaseUrl()}/api/webhooks/channels/wuzapi/${credentials.webhookEndpointToken}`;
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
  const provisioned = await createManagedWuzapiProvisioner(input.config)
    .provision({
      hmacKey: credentials.webhookHmacKey,
      instanceName: createManagedWuzapiInstanceName(
        input.organizationId,
        channelId,
      ),
      token: credentials.userToken,
      webhookUrl,
    });
  await saveExternalInstance({
    ...input,
    channelId,
    credentials,
    externalInstanceId: provisioned.externalInstanceId,
  });

  await updateManagedRunStep({
    admin: input.admin,
    organizationId: input.organizationId,
    runId,
    step: "configuring_webhook",
  });
  const adapter = createWuzapiAdapter(credentials);
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
  const pairing = await adapter.requestPairing({
    method: "qr",
    phoneNumber: "",
  });
  const health = pairing.kind === "none" ? await adapter.getHealth() : null;
  const status = health?.status ?? "awaiting_pairing";
  await savePairingState({
    admin: input.admin,
    channelId,
    externalInstanceId:
      health?.externalInstanceId ?? provisioned.externalInstanceId,
    organizationId: input.organizationId,
    phoneNumber: health?.phoneNumber ?? null,
    reason: health?.reason ?? "Leia o QR Code com o WhatsApp.",
    status,
  });
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

async function saveExternalInstance(input: {
  actorUserId: string;
  admin: AdminClient;
  channelId: string;
  credentials: Parameters<typeof createWuzapiAdapter>[0];
  externalInstanceId: string;
  organizationId: string;
}) {
  const { error } = await input.admin.rpc("save_channel_provider_configuration", {
    actor_user_id: input.actorUserId,
    configured_base_url: input.credentials.baseUrl,
    configured_external_instance_id: input.externalInstanceId,
    configured_provider: "wuzapi",
    encrypted_provider_credentials: encryptSecret(
      JSON.stringify(input.credentials),
    ),
    provider_status: "connecting",
    provider_status_reason: "Instância criada. Preparando o QR Code.",
    target_connection_id: input.channelId,
    target_organization_id: input.organizationId,
  });
  if (error) throw new ManagedProvisioningDatabaseError();
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
      .update({
        configured_at: now,
        last_error_at: null,
        last_error_code: null,
        status: "active",
        updated_at: now,
      })
      .eq("id", input.endpointId)
      .eq("organization_id", input.organizationId),
    input.admin
      .from("channel_connections")
      .update({ webhook_configured_at: now })
      .eq("id", input.channelId)
      .eq("organization_id", input.organizationId),
  ]);
  if (endpointError || channelError) {
    throw new ManagedProvisioningDatabaseError();
  }
}

async function savePairingState(input: {
  admin: AdminClient;
  channelId: string;
  externalInstanceId: string;
  organizationId: string;
  phoneNumber: string | null;
  reason: string;
  status: string;
}) {
  const { error } = await input.admin.rpc("update_channel_provider_health", {
    configured_external_instance_id: input.externalInstanceId,
    provider_status: input.status,
    provider_status_reason: input.reason,
    target_connection_id: input.channelId,
    target_organization_id: input.organizationId,
  });
  if (error) throw new ManagedProvisioningDatabaseError();
  if (!input.phoneNumber) return;

  const { error: phoneError } = await input.admin
    .from("channel_connections")
    .update({ phone_number: input.phoneNumber })
    .eq("id", input.channelId)
    .eq("organization_id", input.organizationId);
  if (phoneError) throw new ManagedProvisioningDatabaseError();
}
