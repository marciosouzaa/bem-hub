import { describe, expect, test } from "bun:test";

import {
  createManagedWuzapiInstanceName,
  createManagedWuzapiProvisioner,
} from "@/features/channels/providers/wuzapi/wuzapi-managed-provisioner";

const config = {
  adminToken: "wuzapi-admin-token-for-tests",
  baseUrl: "https://wuzapi.example.com",
};

const provisioning = {
  hmacKey: "managed-hmac-key-with-more-than-thirty-two-characters",
  instanceName: "bemhub-a0000000-ca000000",
  token: "managed-user-token-for-tests",
  webhookUrl:
    "https://app.example.com/api/webhooks/channels/wuzapi/endpoint-token",
};

describe("managed Wuzapi provisioner", () => {
  test("creates a user with server-owned credentials and webhook", async () => {
    let request: { init?: RequestInit; url?: string } = {};
    const fetcher = (async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      request = { init, url: input.toString() };
      return jsonResponse({
        code: 201,
        data: {
          id: "wuzapi-user-001",
          name: provisioning.instanceName,
          token: provisioning.token,
        },
        success: true,
      }, 201);
    }) as typeof fetch;

    const result = await createManagedWuzapiProvisioner(
      config,
      fetcher,
    ).provision(provisioning);

    expect(result).toEqual({
      externalInstanceId: "wuzapi-user-001",
      reconciled: false,
    });
    expect(request.url).toBe("https://wuzapi.example.com/admin/users");
    expect((request.init?.headers as Record<string, string>).Authorization)
      .toBe(config.adminToken);
    expect(JSON.parse(String(request.init?.body))).toEqual({
      events: "Message,ReadReceipt",
      hmacKey: provisioning.hmacKey,
      name: provisioning.instanceName,
      token: provisioning.token,
      webhook: provisioning.webhookUrl,
    });
  });

  test("reconciles an existing user after a token conflict", async () => {
    const requests: string[] = [];
    const fetcher = (async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      requests.push(`${init?.method}:${input.toString()}`);
      if (init?.method === "POST") {
        return jsonResponse({
          code: 409,
          error: "user with this token already exists",
          success: false,
        }, 409);
      }
      return jsonResponse({
        code: 200,
        data: [
          {
            id: "wuzapi-user-existing",
            name: provisioning.instanceName,
            token: provisioning.token,
          },
        ],
        success: true,
      });
    }) as typeof fetch;

    const result = await createManagedWuzapiProvisioner(
      config,
      fetcher,
    ).provision(provisioning);

    expect(result).toEqual({
      externalInstanceId: "wuzapi-user-existing",
      reconciled: true,
    });
    expect(requests).toEqual([
      "POST:https://wuzapi.example.com/admin/users",
      "GET:https://wuzapi.example.com/admin/users",
    ]);
  });

  test("discovers the connected phone through the managed user", async () => {
    const fetcher = (async () =>
      jsonResponse({
        code: 200,
        data: [
          {
            id: "wuzapi-user-001",
            jid: "5511999999999:42@s.whatsapp.net",
            name: provisioning.instanceName,
            token: provisioning.token,
          },
        ],
        success: true,
      })) as typeof fetch;

    const phoneNumber = await createManagedWuzapiProvisioner(
      config,
      fetcher,
    ).getPhoneNumber({
      externalInstanceId: "wuzapi-user-001",
      token: provisioning.token,
    });

    expect(phoneNumber).toBe("5511999999999");
  });

  test("derives an opaque stable instance name", () => {
    expect(createManagedWuzapiInstanceName(
      "a0000000-0000-0000-0000-000000000001",
      "ca000000-0000-0000-0000-000000000001",
    )).toBe("bemhub-a0000000-ca000000");
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
