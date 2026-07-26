import { z } from "zod";

import { evolutionCredentialsSchema } from "@/features/channels/channel-provider-schema";
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
import {
  createEvolutionWebhookSecret,
  verifyAndNormalizeEvolutionWebhook,
} from "@/features/channels/providers/evolution/evolution-webhook";

const connectionStateSchema = z.object({
  instance: z.object({
    instanceName: z.string().optional(),
    state: z.string(),
  }),
});

const connectResponseSchema = z.object({
  base64: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  pairingCode: z.string().nullable().optional(),
});

const sentMessageSchema = z.object({
  key: z.object({ id: z.string().trim().min(1) }),
});

type EvolutionCredentials = z.infer<typeof evolutionCredentialsSchema>;

export function createEvolutionAdapter(
  rawCredentials: EvolutionCredentials,
  fetcher: typeof fetch = fetch,
): ChannelProviderAdapter {
  const credentials = evolutionCredentialsSchema.parse(rawCredentials);
  const instancePath = encodeURIComponent(credentials.instanceName);
  const headers = {
    apikey: credentials.apiKey,
    "Content-Type": "application/json",
  };

  return {
    provider: "evolution",
    async provision() {
      try {
        await fetchProviderJson(
          fetcher,
          `${credentials.baseUrl}/instance/connectionState/${instancePath}`,
          { headers, method: "GET" },
        );
      } catch (error) {
        if (!(error instanceof ChannelProviderRequestError) || error.status !== 404) {
          throw error;
        }
        await fetchProviderJson(
          fetcher,
          `${credentials.baseUrl}/instance/create`,
          {
            body: JSON.stringify({
              instanceName: credentials.instanceName,
              integration: "WHATSAPP-BAILEYS",
              qrcode: true,
            }),
            headers,
            method: "POST",
          },
        );
      }
    },
    async configureWebhook(input) {
      await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/webhook/set/${instancePath}`,
        {
          body: JSON.stringify({
            webhook: {
              base64: false,
              byEvents: false,
              enabled: true,
              events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE"],
              headers: {
                "X-BEM-HUB-Webhook-Key": createEvolutionWebhookSecret(
                  credentials.apiKey,
                  credentials.instanceName,
                ),
              },
              url: input.url,
            },
          }),
          headers,
          method: "POST",
        },
      );
      const payload = await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/webhook/find/${instancePath}`,
        { headers, method: "GET" },
      );
      if (readConfiguredWebhookUrl(payload) !== input.url) {
        throw new Error("Webhook não confirmado pelo provedor.");
      }
    },
    async getHealth() {
      const payload = await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/instance/connectionState/${instancePath}`,
        { headers, method: "GET" },
      );
      return mapHealth(connectionStateSchema.parse(payload), credentials.instanceName);
    },
    async requestPairing(input): Promise<ChannelPairing> {
      const query = input.method === "pin"
        ? `?number=${encodeURIComponent(onlyDigits(input.phoneNumber))}`
        : "";
      const payload = await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/instance/connect/${instancePath}${query}`,
        { headers, method: "GET" },
      );
      const parsed = connectResponseSchema.parse(payload);
      if (input.method === "pin" && parsed.pairingCode) {
        return { kind: "code", value: parsed.pairingCode };
      }
      const qrCode = parsed.base64 ?? parsed.code;
      return qrCode ? { kind: "qr", value: qrCode } : { kind: "none", value: null };
    },
    async disconnect() {
      await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/instance/logout/${instancePath}`,
        { headers, method: "DELETE" },
      );
    },
    async sendTextMessage(input) {
      const payload = await fetchProviderJson(
        fetcher,
        `${credentials.baseUrl}/message/sendText/${instancePath}`,
        {
          body: JSON.stringify({
            number: onlyDigits(input.recipient),
            text: input.text,
          }),
          headers,
          method: "POST",
        },
      );
      return {
        externalMessageId: sentMessageSchema.parse(payload).key.id,
      };
    },
    verifyAndNormalizeWebhook(input) {
      return verifyAndNormalizeEvolutionWebhook(
        input,
        credentials.apiKey,
        credentials.instanceName,
      );
    },
  };
}

function mapHealth(
  payload: z.infer<typeof connectionStateSchema>,
  instanceName: string,
): ChannelProviderHealth {
  const state = payload.instance.state.toLowerCase();
  if (state === "open") {
    return { externalInstanceId: instanceName, reason: null, status: "connected" };
  }
  if (state === "connecting") {
    return {
      externalInstanceId: instanceName,
      reason: "Aguardando autenticação no WhatsApp.",
      status: "connecting",
    };
  }
  return {
    externalInstanceId: instanceName,
    reason: "Número ainda não conectado.",
    status: "disconnected",
  };
}

function readConfiguredWebhookUrl(payload: unknown) {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.url === "string") return record.url;
  if (typeof record.webhook !== "object" || record.webhook === null) return null;
  const webhook = record.webhook as Record<string, unknown>;
  return typeof webhook.url === "string" ? webhook.url : null;
}
