import { describe, expect, test } from "bun:test";

import { createUazapiAdapter } from "@/features/channels/providers/uazapi/uazapi-adapter";
import { createZApiAdapter } from "@/features/channels/providers/z-api/z-api-adapter";

const uazapiCredentials = {
  baseUrl: "https://free.uazapi.com",
  instanceToken: "10000000-0000-4000-8000-000000000001",
  provider: "uazapi" as const,
};

const zApiCredentials = {
  clientToken: "client-token-for-tests",
  instanceId: "instance-test-01",
  instanceToken: "instance-token-test",
  provider: "z_api" as const,
};

describe("Uazapi adapter", () => {
  test("normaliza conexão ativa e envia token somente no header", async () => {
    let request: { init?: RequestInit; url?: string } = {};
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      request = { init, url: input.toString() };
      return jsonResponse({
        instance: { id: "instance-uazapi", status: "connected" },
        status: { connected: true, loggedIn: true },
      });
    }) as typeof fetch;

    const health = await createUazapiAdapter(uazapiCredentials, fetcher).getHealth();

    expect(health).toEqual({
      externalInstanceId: "instance-uazapi",
      reason: null,
      status: "connected",
    });
    expect(request.url).toBe("https://free.uazapi.com/instance/status");
    expect((request.init?.headers as Record<string, string>).token).toBe(
      uazapiCredentials.instanceToken,
    );
    expect(request.url).not.toContain(uazapiCredentials.instanceToken);
  });

  test("solicita código de pareamento com telefone normalizado", async () => {
    let body = "";
    const fetcher = (async (_input: string | URL | Request, init?: RequestInit) => {
      body = String(init?.body);
      return jsonResponse({
        connected: false,
        instance: { paircode: "ABCD-1234", status: "connecting" },
      });
    }) as typeof fetch;

    const pairing = await createUazapiAdapter(uazapiCredentials, fetcher).requestPairing({
      method: "pin",
      phoneNumber: "+55 (11) 99999-9999",
    });

    expect(pairing).toEqual({ kind: "code", value: "ABCD-1234" });
    expect(JSON.parse(body)).toEqual({ phone: "5511999999999" });
  });
});

describe("Z-API adapter", () => {
  test("consulta status com Client-Token no header", async () => {
    let request: { init?: RequestInit; url?: string } = {};
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      request = { init, url: input.toString() };
      return jsonResponse({ connected: true, smartphoneConnected: true });
    }) as typeof fetch;

    const health = await createZApiAdapter(zApiCredentials, fetcher).getHealth();

    expect(health.status).toBe("connected");
    expect(request.url).toContain(`/instances/${zApiCredentials.instanceId}/token/`);
    expect((request.init?.headers as Record<string, string>)["Client-Token"]).toBe(
      zApiCredentials.clientToken,
    );
  });

  test("retorna QR Code fornecido pela instância", async () => {
    const fetcher = (async () => jsonResponse({
      value: "data:image/png;base64,dGVzdGU=",
    })) as typeof fetch;

    const pairing = await createZApiAdapter(zApiCredentials, fetcher).requestPairing({
      method: "qr",
      phoneNumber: "+55 11 99999-9999",
    });

    expect(pairing).toEqual({
      kind: "qr",
      value: "data:image/png;base64,dGVzdGU=",
    });
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
