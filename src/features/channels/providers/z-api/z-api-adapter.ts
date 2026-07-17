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
import { zApiCredentialsSchema } from "@/features/channels/channel-provider-schema";

const statusResponseSchema = z.object({
  connected: z.boolean(),
  error: z.string().nullable().optional(),
  smartphoneConnected: z.boolean().optional(),
});

const pairingResponseSchema = z.object({ value: z.string().min(1) });

type ZApiCredentials = z.infer<typeof zApiCredentialsSchema>;

export function createZApiAdapter(
  rawCredentials: ZApiCredentials,
  fetcher: typeof fetch = fetch,
): ChannelProviderAdapter {
  const credentials = zApiCredentialsSchema.parse(rawCredentials);
  const baseUrl = `https://api.z-api.io/instances/${encodeURIComponent(
    credentials.instanceId,
  )}/token/${encodeURIComponent(credentials.instanceToken)}`;
  const headers = {
    "Client-Token": credentials.clientToken,
    "Content-Type": "application/json",
  };

  return {
    provider: "z_api",
    async getHealth() {
      const payload = await fetchProviderJson(
        fetcher,
        `${baseUrl}/status`,
        { headers, method: "GET" },
      );
      return mapHealth(statusResponseSchema.parse(payload), credentials.instanceId);
    },
    async requestPairing(input: PairingInput): Promise<ChannelPairing> {
      const endpoint = input.method === "pin"
        ? `/phone-code/${encodeURIComponent(onlyDigits(input.phoneNumber))}`
        : "/qr-code";
      const payload = await fetchProviderJson(
        fetcher,
        `${baseUrl}${endpoint}`,
        { headers, method: "GET" },
      );
      const parsed = pairingResponseSchema.parse(payload);
      return input.method === "pin"
        ? { kind: "code", value: parsed.value }
        : { kind: "qr", value: parsed.value };
    },
    async disconnect() {
      await fetchProviderJson(
        fetcher,
        `${baseUrl}/disconnect`,
        { headers, method: "GET" },
      );
    },
  };
}

function mapHealth(
  payload: z.infer<typeof statusResponseSchema>,
  instanceId: string,
): ChannelProviderHealth {
  if (payload.connected) {
    return { externalInstanceId: instanceId, reason: null, status: "connected" };
  }
  return {
    externalInstanceId: instanceId,
    reason: payload.error || "Número ainda não conectado.",
    status: "disconnected",
  };
}
