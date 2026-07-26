import { z } from "zod";

import { wuzapiCredentialsSchema } from "@/features/channels/channel-provider-schema";
import type {
  ChannelPairing,
  ChannelProviderAdapter,
  ChannelProviderHealth,
} from "@/features/channels/providers/channel-provider-adapter";
import {
  fetchProviderJson,
  onlyDigits,
} from "@/features/channels/providers/provider-http";
import { verifyAndNormalizeWuzapiWebhook } from "@/features/channels/providers/wuzapi/wuzapi-webhook";

const statusResponseSchema = z.object({
  data: z.object({
    connected: z.boolean(),
    loggedIn: z.boolean(),
  }),
});

const qrResponseSchema = z.object({
  data: z.object({ QRCode: z.string().min(1) }),
});

const webhookResponseSchema = z.object({
  data: z.object({ webhook: z.string().url() }),
});

const sentMessageSchema = z.object({
  data: z.object({ Id: z.string().trim().min(1) }),
});

type WuzapiCredentials = z.infer<typeof wuzapiCredentialsSchema>;

export function createWuzapiAdapter(
  rawCredentials: WuzapiCredentials,
  fetcher: typeof fetch = fetch,
): ChannelProviderAdapter {
  const credentials = wuzapiCredentialsSchema.parse(rawCredentials);
  const headers = {
    "Content-Type": "application/json",
    token: credentials.userToken,
  };

  return {
    provider: "wuzapi",
    async configureWebhook(input) {
      await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/session/hmac/config`,
        {
          body: JSON.stringify({ hmac_key: credentials.webhookHmacKey }),
          headers,
          method: "POST",
        },
      );
      await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/webhook`,
        {
          body: JSON.stringify({
            events: ["Message", "ReadReceipt"],
            webhookURL: input.url,
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
      if (webhookResponseSchema.parse(payload).data.webhook !== input.url) {
        throw new Error("Webhook não confirmado pelo provedor.");
      }
    },
    async getHealth() {
      const payload = await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/session/status`,
        { headers, method: "GET" },
      );
      return mapHealth(statusResponseSchema.parse(payload));
    },
    async requestPairing(): Promise<ChannelPairing> {
      await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/session/connect`,
        {
          body: JSON.stringify({
            Immediate: true,
            Subscribe: ["Message", "ReadReceipt"],
          }),
          headers,
          method: "POST",
        },
      );
      const statusPayload = await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/session/status`,
        { headers, method: "GET" },
      );
      const status = statusResponseSchema.parse(statusPayload);
      if (status.data.loggedIn) return { kind: "none", value: null };

      const qrPayload = await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/session/qr`,
        { headers, method: "GET" },
      );
      return {
        kind: "qr",
        value: qrResponseSchema.parse(qrPayload).data.QRCode,
      };
    },
    async disconnect() {
      await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/session/disconnect`,
        { headers, method: "POST" },
      );
    },
    async sendTextMessage(input) {
      const messageId = input.trackingId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const payload = await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/chat/send/text`,
        {
          body: JSON.stringify({
            Body: input.text,
            Id: messageId,
            Phone: onlyDigits(input.recipient),
          }),
          headers,
          method: "POST",
        },
      );
      return {
        externalMessageId: sentMessageSchema.parse(payload).data.Id,
      };
    },
    verifyAndNormalizeWebhook(input) {
      return verifyAndNormalizeWuzapiWebhook(input, credentials.webhookHmacKey);
    },
  };
}

function mapHealth(
  payload: z.infer<typeof statusResponseSchema>,
): ChannelProviderHealth {
  if (payload.data.connected && payload.data.loggedIn) {
    return { externalInstanceId: null, reason: null, status: "connected" };
  }
  if (payload.data.connected) {
    return {
      externalInstanceId: null,
      reason: "Aguardando leitura do QR Code.",
      status: "connecting",
    };
  }
  return {
    externalInstanceId: null,
    reason: "Sessão Wuzapi ainda não conectada.",
    status: "disconnected",
  };
}
