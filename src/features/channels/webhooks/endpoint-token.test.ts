import { describe, expect, test } from "bun:test";

import {
  createWebhookEndpointToken,
  hashWebhookEndpointToken,
  hashWebhookPayload,
  webhookEndpointTokenSchema,
} from "@/features/channels/webhooks/endpoint-token";

describe("channel webhook endpoint tokens", () => {
  test("gera segredo forte e persiste somente o hash", () => {
    const token = createWebhookEndpointToken();

    expect(webhookEndpointTokenSchema.safeParse(token).success).toBe(true);
    expect(hashWebhookEndpointToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashWebhookEndpointToken(token)).not.toContain(token);
  });

  test("hash do payload é determinístico", () => {
    expect(hashWebhookPayload('{"event":"messages"}')).toBe(
      hashWebhookPayload('{"event":"messages"}'),
    );
  });
});
