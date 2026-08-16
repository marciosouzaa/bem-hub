import { z } from "zod";

import {
  channelProviderCredentialsSchema,
  channelProviderSchema,
  type ChannelProvider,
} from "@/features/channels/channel-provider-schema";
import { resolveChannelProvider } from "@/features/channels/providers/resolve-channel-provider";
import {
  hashWebhookEndpointToken,
  hashWebhookPayload,
} from "@/features/channels/webhooks/endpoint-token";
import { decryptSecret } from "@/lib/security/encryption";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { storeInboundSupportMedia } from "@/features/support/store-inbound-support-media";
import { syncSupportContactAvatarForInboundMessage } from "@/features/support/support-contact-avatar-sync";

const ingestResultSchema = z.object({
  duplicate: z.boolean(),
  messageId: z.string().uuid().nullable(),
  status: z.enum(["failed", "processed"]),
});

export class ChannelWebhookEndpointNotFoundError extends Error {
  constructor() {
    super("Webhook não encontrado.");
    this.name = "ChannelWebhookEndpointNotFoundError";
  }
}

export class ChannelWebhookProviderUnsupportedError extends Error {
  constructor() {
    super("Provedor ainda não recebe webhooks.");
    this.name = "ChannelWebhookProviderUnsupportedError";
  }
}

type ProcessChannelWebhookInput = {
  endpointToken: string;
  headers: Headers;
  payload: unknown;
  provider: ChannelProvider;
  rawBody: string;
};

export async function processChannelWebhook(
  input: ProcessChannelWebhookInput,
) {
  const provider = channelProviderSchema.parse(input.provider);
  const admin = createSupabaseAdminClient();
  const secretHash = hashWebhookEndpointToken(input.endpointToken);
  const { data: endpoint, error: endpointError } = await admin
    .from("channel_webhook_endpoints")
    .select("id,channel_connection_id,organization_id,provider,status")
    .eq("secret_hash", secretHash)
    .eq("provider", provider)
    .eq("status", "active")
    .maybeSingle();

  if (endpointError) throw endpointError;
  if (!endpoint) throw new ChannelWebhookEndpointNotFoundError();

  const [{ data: channel, error: channelError }, { data: stored, error: storedError }] =
    await Promise.all([
      admin
        .from("channel_connections")
        .select("external_instance_id,id,is_deleted,organization_id,provider")
        .eq("id", endpoint.channel_connection_id)
        .eq("organization_id", endpoint.organization_id)
        .eq("provider", provider)
        .maybeSingle(),
      admin
        .from("channel_credentials")
        .select("encrypted_credentials,provider")
        .eq("channel_connection_id", endpoint.channel_connection_id)
        .eq("organization_id", endpoint.organization_id)
        .eq("provider", provider)
        .maybeSingle(),
    ]);

  if (channelError) throw channelError;
  if (storedError) throw storedError;
  if (!channel || channel.is_deleted || !stored) {
    throw new ChannelWebhookEndpointNotFoundError();
  }

  const credentials = channelProviderCredentialsSchema.parse(
    JSON.parse(decryptSecret(stored.encrypted_credentials)),
  );
  if (credentials.provider !== provider) {
    throw new ChannelWebhookEndpointNotFoundError();
  }

  const adapter = resolveChannelProvider(credentials);
  if (!adapter.verifyAndNormalizeWebhook) {
    throw new ChannelWebhookProviderUnsupportedError();
  }

  const events = await adapter.verifyAndNormalizeWebhook({
    expectedInstanceId: channel.external_instance_id,
    headers: input.headers,
    payload: input.payload,
    rawBody: input.rawBody,
  });

  await Promise.all([
    admin
      .from("channel_webhook_endpoints")
      .update({
        last_error_at: null,
        last_error_code: null,
        last_received_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", endpoint.id),
    admin
      .from("channel_connections")
      .update({ webhook_verified_at: new Date().toISOString() })
      .eq("id", channel.id)
      .eq("organization_id", endpoint.organization_id),
  ]);

  const payloadSha256 = hashWebhookPayload(input.rawBody);
  let duplicates = 0;
  let failed = 0;
  let processed = 0;

  for (const event of events) {
    const { data, error } = event.type === "message.delivery_updated"
      ? await admin.rpc("ingest_support_message_delivery_update", {
          target_delivery_status: event.deliveryStatus,
          target_payload_sha256: payloadSha256,
          target_provider_event_id: event.eventId,
          target_provider_message_id: event.providerMessageId,
          target_provider_occurred_at: event.occurredAt,
          target_webhook_endpoint_id: endpoint.id,
        })
      : await admin.rpc("ingest_channel_inbound_message", {
          event_type: event.type,
          message_text: event.text,
          payload_sha256: payloadSha256,
          provider_event_id: event.providerMessageId,
          provider_occurred_at: event.occurredAt,
          sender_identity_type: event.senderIdentityType,
          sender_identity_value: event.senderIdentityValue,
          sender_name: event.senderName ?? "",
          sender_phone: event.senderPhone ?? "",
          target_webhook_endpoint_id: endpoint.id,
        });
    if (error) throw error;

    const result = ingestResultSchema.parse(data);
    if (
      event.type !== "message.delivery_updated"
      && event.replyToProviderMessageId
      && result.messageId
    ) {
      const { error: replyError } = await admin.rpc(
        "link_support_message_reply",
        {
          target_message_id: result.messageId,
          target_provider_message_id: event.replyToProviderMessageId,
          target_webhook_endpoint_id: endpoint.id,
        },
      );
      if (replyError) throw replyError;
    }
    if (event.type !== "message.delivery_updated" && event.media) {
      if (!result.messageId) throw new Error("Webhook de mídia não retornou a mensagem persistida.");
      await storeInboundSupportMedia({
        adapter,
        event,
        messageId: result.messageId,
        organizationId: endpoint.organization_id,
        supabase: admin,
      });
    }
    if (
      event.type !== "message.delivery_updated"
      && !result.duplicate
      && result.messageId
    ) {
      await syncSupportContactAvatarForInboundMessage({
        admin,
        adapter,
        messageId: result.messageId,
        organizationId: endpoint.organization_id,
        phone: event.senderPhone ?? null,
      });
    }
    if (result.status === "failed") {
      failed += 1;
    } else if (result.duplicate) {
      duplicates += 1;
    } else {
      processed += 1;
    }
  }

  return {
    duplicates,
    failed,
    ignored: events.length === 0 ? 1 : 0,
    processed,
  };
}
