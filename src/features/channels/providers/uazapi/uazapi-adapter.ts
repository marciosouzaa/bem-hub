import { z } from "zod";

import type {
  ChannelPairing,
  ChannelProviderAdapter,
  ChannelProviderHealth,
  PairingInput,
} from "@/features/channels/providers/channel-provider-adapter";
import {
  fetchProviderJson,
  onlyDigits,
} from "@/features/channels/providers/provider-http";
import { uazapiCredentialsSchema } from "@/features/channels/channel-provider-schema";
import { verifyAndNormalizeUazapiWebhook } from "@/features/channels/providers/uazapi/uazapi-webhook";

const instanceSchema = z.object({
  id: z.string().nullable().optional(),
  paircode: z.string().nullable().optional(),
  qrcode: z.string().nullable().optional(),
  status: z.enum(["connected", "connecting", "disconnected", "hibernated"]).optional(),
});

const statusResponseSchema = z.object({
  instance: instanceSchema.optional(),
  status: z.object({
    connected: z.boolean().optional(),
    loggedIn: z.boolean().optional(),
  }).optional(),
});

const connectResponseSchema = z.object({
  connected: z.boolean().optional(),
  instance: instanceSchema.optional(),
  loggedIn: z.boolean().optional(),
});

const webhookSchema = z.object({
  enabled: z.boolean().optional(),
  url: z.string().url(),
});

const sentMessageSchema = z.object({
  messageid: z.string().trim().min(1),
});

type UazapiCredentials = z.infer<typeof uazapiCredentialsSchema>;

export function createUazapiAdapter(
  rawCredentials: UazapiCredentials,
  fetcher: typeof fetch = fetch,
): ChannelProviderAdapter {
  const credentials = uazapiCredentialsSchema.parse(rawCredentials);
  const headers = {
    "Content-Type": "application/json",
    token: credentials.instanceToken,
  };

  return {
    provider: "uazapi",
    async configureWebhook(input) {
      await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/webhook`,
        {
          body: JSON.stringify({
            addUrlEvents: false,
            addUrlTypesMessages: false,
            enabled: true,
            events: ["messages"],
            excludeMessages: ["wasSentByApi", "isGroupYes"],
            url: input.url,
          }),
          headers,
          method: "POST",
        },
      );
      const payload = await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/webhook`,
        { headers, method: "GET" },
      );
      const webhooks = z.array(webhookSchema).parse(payload);
      const configured = webhooks.some(
        (webhook) => webhook.url === input.url && webhook.enabled !== false,
      );
      if (!configured) {
        throw new Error("Webhook não confirmado pelo provedor.");
      }
    },
    async getHealth() {
      const payload = await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/instance/status`,
        { headers, method: "GET" },
      );
      const parsed = statusResponseSchema.parse(payload);
      return mapHealth(parsed);
    },
    async requestPairing(input: PairingInput): Promise<ChannelPairing> {
      const body = input.method === "pin"
        ? { phone: onlyDigits(input.phoneNumber) }
        : {};
      const payload = await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/instance/connect`,
        { body: JSON.stringify(body), headers, method: "POST" },
      );
      const parsed = connectResponseSchema.parse(payload);
      if (parsed.connected || parsed.loggedIn) return { kind: "none", value: null };
      const instance = parsed.instance;
      if (input.method === "pin" && instance?.paircode) {
        return { kind: "code", value: instance.paircode };
      }
      if (instance?.qrcode) return { kind: "qr", value: instance.qrcode };
      return { kind: "none", value: null };
    },
    async disconnect() {
      await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/instance/disconnect`,
        { headers, method: "POST" },
      );
    },
    async sendTextMessage(input) {
      const payload = await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/send/text`,
        {
          body: JSON.stringify({
            number: input.recipient,
            text: input.text,
            track_id: input.trackingId,
            track_source: "bem-hub-support",
          }),
          headers,
          method: "POST",
        },
      );
      const message = sentMessageSchema.parse(payload);
      return { externalMessageId: message.messageid };
    },
    verifyAndNormalizeWebhook(input) {
      return verifyAndNormalizeUazapiWebhook(input, credentials.instanceToken);
    },
  };
}

function mapHealth(payload: z.infer<typeof statusResponseSchema>): ChannelProviderHealth {
  const instanceStatus = payload.instance?.status;
  if (payload.status?.connected || payload.status?.loggedIn || instanceStatus === "connected") {
    return {
      externalInstanceId: payload.instance?.id ?? null,
      reason: null,
      status: "connected",
    };
  }
  if (instanceStatus === "connecting") {
    return {
      externalInstanceId: payload.instance?.id ?? null,
      reason: "Aguardando autenticação no WhatsApp.",
      status: "connecting",
    };
  }
  if (instanceStatus === "hibernated") {
    return {
      externalInstanceId: payload.instance?.id ?? null,
      reason: "Sessão hibernada pelo provedor.",
      status: "degraded",
    };
  }
  return {
    externalInstanceId: payload.instance?.id ?? null,
    reason: "Número ainda não conectado.",
    status: "disconnected",
  };
}
