import { z } from "zod";

import { wuzapiCredentialsSchema } from "@/features/channels/channel-provider-schema";
import type {
  ChannelPairing,
  ChannelProviderAdapter,
  ChannelProviderHealth,
} from "@/features/channels/providers/channel-provider-adapter";
import {
  ChannelProviderRequestError,
  fetchProviderJson,
  onlyDigits,
} from "@/features/channels/providers/provider-http";
import { verifyAndNormalizeWuzapiWebhook } from "@/features/channels/providers/wuzapi/wuzapi-webhook";

const pairingPollAttempts = 20;
const pairingPollIntervalMs = 250;

const statusResponseSchema = z.object({
  data: z.object({
    connected: z.boolean(),
    id: z.string().trim().min(1).optional(),
    jid: z.string().optional(),
    loggedIn: z.boolean(),
  }),
});

const qrResponseSchema = z.object({
  data: z.object({ QRCode: z.string().nullish() }),
});

const webhookResponseSchema = z.object({
  data: z.object({
    subscribe: z.union([z.array(z.string()), z.string()]).optional(),
    webhook: z.string().url(),
  }),
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
      const health = await getWebhookHealth(input.url);
      if (!health.healthy) {
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
    async getWebhookHealth(input) {
      return getWebhookHealth(input.url);
    },
    async requestPairing(): Promise<ChannelPairing> {
      let status = await getStatus();
      if (status.data.loggedIn) return { kind: "none", value: null };

      if (!status.data.connected) {
        try {
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
        } catch (error) {
          if (
            !(error instanceof ChannelProviderRequestError)
            || error.status !== 500
          ) {
            throw error;
          }

          status = await getStatus();
          if (!status.data.connected && !status.data.loggedIn) throw error;
        }
      }

      for (let attempt = 0; attempt < pairingPollAttempts; attempt += 1) {
        status = await getStatus();
        if (status.data.loggedIn) return { kind: "none", value: null };

        try {
          const qrPayload = await fetchProviderJson(
            fetcher,
            `${credentials.baseUrl}/session/qr`,
            { headers, method: "GET" },
          );
          const parsedQr = qrResponseSchema.safeParse(qrPayload);
          const qrCode = parsedQr.success ? parsedQr.data.data.QRCode?.trim() : "";
          if (qrCode) return { kind: "qr", value: qrCode };
        } catch (error) {
          if (
            !(error instanceof ChannelProviderRequestError)
            || error.status !== 500
            || attempt === pairingPollAttempts - 1
          ) {
            throw error;
          }
        }

        if (attempt < pairingPollAttempts - 1) {
          await wait(pairingPollIntervalMs);
        }
      }

      throw new ChannelProviderRequestError(
        "O QR Code ainda está sendo preparado. Tente novamente.",
      );
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

  async function getStatus() {
    const payload = await fetchProviderJson(
      fetcher,
      `${credentials.baseUrl}/session/status`,
      { headers, method: "GET" },
    );
    return statusResponseSchema.parse(payload);
  }

  async function getWebhookHealth(expectedUrl: string) {
    const payload = await fetchProviderJson(
      fetcher,
      `${credentials.baseUrl}/webhook`,
      { headers, method: "GET" },
    );
    const configured = webhookResponseSchema.parse(payload).data;
    const subscribedEvents = normalizeSubscribedEvents(configured.subscribe);
    const hasRequiredEvents = ["Message", "ReadReceipt"].every((event) =>
      subscribedEvents.has(event)
    );
    if (configured.webhook !== expectedUrl) {
      return {
        healthy: false,
        reason: "O webhook aponta para um endereço diferente.",
      };
    }
    if (!hasRequiredEvents) {
      return {
        healthy: false,
        reason: "O webhook não assina todos os eventos necessários.",
      };
    }
    return { healthy: true, reason: null };
  }
}

function mapHealth(
  payload: z.infer<typeof statusResponseSchema>,
): ChannelProviderHealth {
  const identity = getPhoneFromJid(payload.data.jid);
  if (payload.data.connected && payload.data.loggedIn) {
    return {
      externalInstanceId: payload.data.id ?? null,
      ...(identity ? { phoneNumber: identity } : {}),
      reason: null,
      status: "connected",
    };
  }
  if (payload.data.connected) {
    return {
      externalInstanceId: payload.data.id ?? null,
      ...(identity ? { phoneNumber: identity } : {}),
      reason: "Aguardando leitura do QR Code.",
      status: "connecting",
    };
  }
  return {
    externalInstanceId: payload.data.id ?? null,
    ...(identity ? { phoneNumber: identity } : {}),
    reason: "Sessão Wuzapi ainda não conectada.",
    status: "disconnected",
  };
}

function getPhoneFromJid(jid: string | undefined) {
  if (!jid) return null;
  const phone = jid.split("@", 1)[0].split(":", 1)[0].replace(/\D/g, "");
  return phone.length >= 10 && phone.length <= 15 ? phone : null;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normalizeSubscribedEvents(
  value: string[] | string | undefined,
) {
  const events = Array.isArray(value) ? value : value?.split(",") ?? [];
  return new Set(events.map((event) => event.trim()).filter(Boolean));
}
