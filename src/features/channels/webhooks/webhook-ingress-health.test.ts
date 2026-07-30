import { describe, expect, test } from "bun:test";

import type { ChannelProviderAdapter } from "@/features/channels/providers/channel-provider-adapter";
import {
  assertWebhookIngressReachable,
  ChannelWebhookIngressUnavailableError,
  reconcileProviderWebhook,
  webhookIngressHealthHeader,
  webhookIngressHealthValue,
} from "@/features/channels/webhooks/webhook-ingress-health";

describe("saúde do ingresso de webhooks", () => {
  test("confirma o endereço público somente com a marca do BEM HUB", async () => {
    const fetcher = (async () =>
      new Response(null, {
        headers: {
          [webhookIngressHealthHeader]: webhookIngressHealthValue,
        },
        status: 204,
      })) as typeof fetch;

    await expect(
      assertWebhookIngressReachable("https://app.example.com", fetcher),
    ).resolves.toBeUndefined();
  });

  test("rejeita túnel indisponível ou apontando para outro serviço", async () => {
    const unavailable = (async () => {
      throw new TypeError("dns lookup failed");
    }) as typeof fetch;
    const wrongService = (async () =>
      new Response(null, { status: 204 })) as typeof fetch;

    await expect(
      assertWebhookIngressReachable("https://old.example.com", unavailable),
    ).rejects.toBeInstanceOf(ChannelWebhookIngressUnavailableError);
    await expect(
      assertWebhookIngressReachable("https://wrong.example.com", wrongService),
    ).rejects.toBeInstanceOf(ChannelWebhookIngressUnavailableError);
  });

  test("reconfigura URL divergente e preserva webhook já saudável", async () => {
    const configuredUrls: string[] = [];
    const ingressFetcher = (async () =>
      new Response(null, {
        headers: {
          [webhookIngressHealthHeader]: webhookIngressHealthValue,
        },
        status: 204,
      })) as typeof fetch;
    let healthy = false;
    const adapter = {
      async configureWebhook({ url }) {
        configuredUrls.push(url);
        healthy = true;
      },
      async disconnect() {},
      async getHealth() {
        return {
          externalInstanceId: "instance-1",
          reason: null,
          status: "connected" as const,
        };
      },
      async getWebhookHealth() {
        return {
          healthy,
          reason: healthy ? null : "URL divergente.",
        };
      },
      provider: "wuzapi" as const,
      async requestPairing() {
        return { kind: "none" as const, value: null };
      },
    } satisfies ChannelProviderAdapter;

    const first = await reconcileProviderWebhook({
      adapter,
      appBaseUrl: "https://app.example.com",
      endpointToken: "a".repeat(48),
      ingressFetcher,
      provider: "wuzapi",
    });
    const second = await reconcileProviderWebhook({
      adapter,
      appBaseUrl: "https://app.example.com",
      endpointToken: "a".repeat(48),
      ingressFetcher,
      provider: "wuzapi",
    });

    expect(first.reconfigured).toBe(true);
    expect(second.reconfigured).toBe(false);
    expect(configuredUrls).toEqual([
      `https://app.example.com/api/webhooks/channels/wuzapi/${"a".repeat(48)}`,
    ]);
  });
});
