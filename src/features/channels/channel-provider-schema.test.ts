import { describe, expect, test } from "bun:test";

import {
  channelProviderCredentialsSchema,
  configurableChannelProviderSchema,
} from "@/features/channels/channel-provider-schema";

describe("channel provider schema", () => {
  test("aceita credenciais Evolution e Wuzapi", () => {
    expect(channelProviderCredentialsSchema.safeParse({
      apiKey: "evolution-api-key-for-tests",
      baseUrl: "https://evolution.example.com",
      instanceName: "bem-hub-test",
      provider: "evolution",
    }).success).toBe(true);

    expect(channelProviderCredentialsSchema.safeParse({
      baseUrl: "https://wuzapi.example.com",
      provider: "wuzapi",
      userToken: "wuzapi-user-token-for-tests",
      webhookHmacKey: "wuzapi-hmac-key-with-more-than-32-characters",
    }).success).toBe(true);
  });

  test("mantém Z-API legível, mas fora dos providers configuráveis", () => {
    expect(channelProviderCredentialsSchema.safeParse({
      clientToken: "client-token-for-tests",
      instanceId: "instance-test-01",
      instanceToken: "instance-token-test",
      provider: "z_api",
    }).success).toBe(true);
    expect(configurableChannelProviderSchema.safeParse("z_api").success).toBe(false);
  });
});
