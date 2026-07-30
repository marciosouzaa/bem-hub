import { describe, expect, test } from "bun:test";

import { createEvolutionAdapter } from "@/features/channels/providers/evolution/evolution-adapter";
import { createEvolutionWebhookSecret } from "@/features/channels/providers/evolution/evolution-webhook";
import { createUazapiAdapter } from "@/features/channels/providers/uazapi/uazapi-adapter";
import { createWuzapiAdapter } from "@/features/channels/providers/wuzapi/wuzapi-adapter";
import { createZApiAdapter } from "@/features/channels/providers/z-api/z-api-adapter";

const evolutionCredentials = {
  apiKey: "evolution-api-key-for-tests",
  baseUrl: "https://evolution.example.com",
  instanceName: "bem-hub-test",
  provider: "evolution" as const,
};

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

const wuzapiCredentials = {
  baseUrl: "https://wuzapi.example.com",
  provider: "wuzapi" as const,
  userToken: "wuzapi-user-token-for-tests",
  webhookHmacKey: "wuzapi-hmac-key-with-more-than-32-characters",
};

describe("Evolution API adapter", () => {
  test("cria a instância quando ela ainda não existe", async () => {
    const requests: Array<{ init?: RequestInit; url: string }> = [];
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ init, url: input.toString() });
      if (requests.length === 1) return jsonResponse({ error: "not found" }, 404);
      return jsonResponse({ instance: { instanceName: "bem-hub-test" } }, 201);
    }) as typeof fetch;

    await createEvolutionAdapter(evolutionCredentials, fetcher).provision?.();

    expect(requests.map((request) => request.url)).toEqual([
      "https://evolution.example.com/instance/connectionState/bem-hub-test",
      "https://evolution.example.com/instance/create",
    ]);
    expect(JSON.parse(String(requests[1].init?.body))).toEqual({
      instanceName: "bem-hub-test",
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
    });
  });

  test("configura webhook com header secreto e eventos de mensagem", async () => {
    const requests: Array<{ init?: RequestInit; url: string }> = [];
    const callbackUrl = "https://app.example.com/api/webhooks/channels/evolution/token";
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ init, url: input.toString() });
      return init?.method === "POST"
        ? jsonResponse({ enabled: true })
        : jsonResponse({ enabled: true, url: callbackUrl });
    }) as typeof fetch;

    await createEvolutionAdapter(evolutionCredentials, fetcher).configureWebhook?.({
      url: callbackUrl,
    });

    expect(JSON.parse(String(requests[0].init?.body))).toEqual({
      webhook: {
        base64: false,
        byEvents: false,
        enabled: true,
        events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE"],
        headers: {
          "X-BEM-HUB-Webhook-Key": createEvolutionWebhookSecret(
            evolutionCredentials.apiKey,
            evolutionCredentials.instanceName,
          ),
        },
        url: callbackUrl,
      },
    });
  });

  test("detecta webhook desativado ou apontando para URL antiga", async () => {
    const responses = [
      {
        enabled: true,
        url: "https://old.example.com/webhook",
      },
      {
        webhook: {
          enabled: false,
          url: "https://app.example.com/webhook",
        },
      },
    ];
    const fetcher = (async () =>
      jsonResponse(responses.shift())) as typeof fetch;
    const adapter = createEvolutionAdapter(evolutionCredentials, fetcher);

    const staleUrl = await adapter.getWebhookHealth?.({
      url: "https://app.example.com/webhook",
    });
    const disabled = await adapter.getWebhookHealth?.({
      url: "https://app.example.com/webhook",
    });

    expect(staleUrl).toEqual({
      healthy: false,
      reason: "O webhook aponta para um endereço diferente.",
    });
    expect(disabled).toEqual({
      healthy: false,
      reason: "O webhook está desativado no provedor.",
    });
  });

  test("envia texto e preserva o ID retornado pelo WhatsApp", async () => {
    let request: { init?: RequestInit; url?: string } = {};
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      request = { init, url: input.toString() };
      return jsonResponse({ key: { id: "evolution-message-001" } });
    }) as typeof fetch;

    const result = await createEvolutionAdapter(
      evolutionCredentials,
      fetcher,
    ).sendTextMessage?.({
      recipient: "+55 (11) 99999-9999",
      text: "Mensagem Evolution",
      trackingId: "internal-id",
    });

    expect(request.url).toBe(
      "https://evolution.example.com/message/sendText/bem-hub-test",
    );
    expect(JSON.parse(String(request.init?.body))).toEqual({
      number: "5511999999999",
      text: "Mensagem Evolution",
    });
    expect(result).toEqual({ externalMessageId: "evolution-message-001" });
  });
});

describe("Uazapi adapter", () => {
  test("configura mensagens recebidas e saídas manuais", async () => {
    const requests: Array<{ init?: RequestInit; url: string }> = [];
    const callbackUrl = "https://app.example.com/api/webhooks/channels/uazapi/test-token";
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ init, url: input.toString() });
      if (init?.method === "POST") return jsonResponse({ ok: true });
      return jsonResponse([{ enabled: true, url: callbackUrl }]);
    }) as typeof fetch;

    await createUazapiAdapter(uazapiCredentials, fetcher).configureWebhook?.({
      url: callbackUrl,
    });

    expect(requests).toHaveLength(2);
    expect(requests.map((request) => request.url)).toEqual([
      "https://free.uazapi.com/webhook",
      "https://free.uazapi.com/webhook",
    ]);
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({
      addUrlEvents: false,
      addUrlTypesMessages: false,
      enabled: true,
      events: ["messages", "messages_update"],
      excludeMessages: ["isGroupYes"],
      url: callbackUrl,
    });
    expect((requests[0].init?.headers as Record<string, string>).token).toBe(
      uazapiCredentials.instanceToken,
    );
  });

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

  test("envia texto pelo endpoint HTTP do provedor", async () => {
    let request: { init?: RequestInit; url?: string } = {};
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      request = { init, url: input.toString() };
      return jsonResponse({ messageid: "provider-message-001" });
    }) as typeof fetch;

    const result = await createUazapiAdapter(
      uazapiCredentials,
      fetcher,
    ).sendTextMessage?.({
      recipient: "5511999999999",
      text: "Mensagem direta",
      trackingId: "support-message-001",
    });

    expect(request.url).toBe("https://free.uazapi.com/send/text");
    expect(request.init?.method).toBe("POST");
    expect(JSON.parse(String(request.init?.body))).toEqual({
      number: "5511999999999",
      text: "Mensagem direta",
      track_id: "support-message-001",
      track_source: "bem-hub-support",
    });
    expect(result).toEqual({ externalMessageId: "provider-message-001" });
  });
});

describe("Wuzapi adapter", () => {
  test("consulta saúde usando contrato e header atuais", async () => {
    let request: { init?: RequestInit; url?: string } = {};
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      request = { init, url: input.toString() };
      return jsonResponse({
        data: {
          connected: true,
          id: "wuzapi-user-001",
          jid: "5511999999999:42@s.whatsapp.net",
          loggedIn: true,
        },
        success: true,
      });
    }) as typeof fetch;

    const health = await createWuzapiAdapter(wuzapiCredentials, fetcher).getHealth();

    expect(request.url).toBe("https://wuzapi.example.com/session/status");
    expect((request.init?.headers as Record<string, string>).token)
      .toBe(wuzapiCredentials.userToken);
    expect(health.status).toBe("connected");
    expect(health.externalInstanceId).toBe("wuzapi-user-001");
    expect(health.phoneNumber).toBe("5511999999999");
  });

  test("configura HMAC antes do webhook e confirma a URL", async () => {
    const requests: Array<{ init?: RequestInit; url: string }> = [];
    const callbackUrl = "https://app.example.com/api/webhooks/channels/wuzapi/token";
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ init, url: input.toString() });
      if (init?.method === "GET") {
        return jsonResponse({
          data: {
            subscribe: "Message,ReadReceipt",
            webhook: callbackUrl,
          },
          success: true,
        });
      }
      return jsonResponse({ data: { Details: "ok" }, success: true });
    }) as typeof fetch;

    await createWuzapiAdapter(wuzapiCredentials, fetcher).configureWebhook?.({
      url: callbackUrl,
    });

    expect(requests.map((request) => request.url)).toEqual([
      "https://wuzapi.example.com/session/hmac/config",
      "https://wuzapi.example.com/webhook",
      "https://wuzapi.example.com/webhook",
    ]);
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({
      hmac_key: wuzapiCredentials.webhookHmacKey,
    });
    expect(JSON.parse(String(requests[1].init?.body))).toEqual({
      events: ["Message", "ReadReceipt"],
      webhookURL: callbackUrl,
    });
    expect((requests[0].init?.headers as Record<string, string>).token)
      .toBe(wuzapiCredentials.userToken);
  });

  test("detecta URL antiga e assinatura incompleta do webhook", async () => {
    const responses = [
      {
        data: {
          subscribe: "Message,ReadReceipt",
          webhook: "https://old.example.com/webhook",
        },
        success: true,
      },
      {
        data: {
          subscribe: "Message",
          webhook: "https://app.example.com/webhook",
        },
        success: true,
      },
    ];
    const fetcher = (async () =>
      jsonResponse(responses.shift())) as typeof fetch;
    const adapter = createWuzapiAdapter(wuzapiCredentials, fetcher);

    const staleUrl = await adapter.getWebhookHealth?.({
      url: "https://app.example.com/webhook",
    });
    const missingEvent = await adapter.getWebhookHealth?.({
      url: "https://app.example.com/webhook",
    });

    expect(staleUrl).toEqual({
      healthy: false,
      reason: "O webhook aponta para um endereço diferente.",
    });
    expect(missingEvent).toEqual({
      healthy: false,
      reason: "O webhook não assina todos os eventos necessários.",
    });
  });

  test("não reinicia uma sessão que já aguarda leitura do QR Code", async () => {
    const requests: Array<{ method: string; url: string }> = [];
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = input.toString();
      requests.push({ method: init?.method ?? "GET", url });
      if (url.endsWith("/session/status")) {
        return jsonResponse({
          data: { connected: true, loggedIn: false },
          success: true,
        });
      }
      if (url.endsWith("/session/qr")) {
        return jsonResponse({
          data: { QRCode: "data:image/png;base64,dGVzdGU=" },
          success: true,
        });
      }
      throw new Error(`Requisição inesperada: ${url}`);
    }) as typeof fetch;

    const pairing = await createWuzapiAdapter(
      wuzapiCredentials,
      fetcher,
    ).requestPairing({
      method: "qr",
      phoneNumber: "",
    });

    expect(pairing).toEqual({
      kind: "qr",
      value: "data:image/png;base64,dGVzdGU=",
    });
    expect(requests).toEqual([
      {
        method: "GET",
        url: "https://wuzapi.example.com/session/status",
      },
      {
        method: "GET",
        url: "https://wuzapi.example.com/session/status",
      },
      {
        method: "GET",
        url: "https://wuzapi.example.com/session/qr",
      },
    ]);
  });

  test("aguarda o QR Code gerado de forma assíncrona", async () => {
    const requests: Array<{ method: string; url: string }> = [];
    let statusReads = 0;
    let qrReads = 0;
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = input.toString();
      requests.push({ method: init?.method ?? "GET", url });
      if (url.endsWith("/session/status")) {
        statusReads += 1;
        return jsonResponse({
          data: {
            connected: statusReads > 1,
            loggedIn: false,
          },
          success: true,
        });
      }
      if (url.endsWith("/session/connect")) {
        return jsonResponse({ data: { Details: "Connected" }, success: true });
      }
      if (url.endsWith("/session/qr")) {
        qrReads += 1;
        return jsonResponse({
          data: {
            QRCode: qrReads > 1
              ? "data:image/png;base64,dGVzdGU="
              : "",
          },
          success: true,
        });
      }
      throw new Error(`Requisição inesperada: ${url}`);
    }) as typeof fetch;

    const pairing = await createWuzapiAdapter(
      wuzapiCredentials,
      fetcher,
    ).requestPairing({
      method: "qr",
      phoneNumber: "",
    });

    expect(pairing).toEqual({
      kind: "qr",
      value: "data:image/png;base64,dGVzdGU=",
    });
    expect(requests.filter((request) =>
      request.url.endsWith("/session/connect")
    )).toHaveLength(1);
    expect(qrReads).toBe(2);
  });

  test("usa um ID determinístico ao enviar texto", async () => {
    let body = "";
    const fetcher = (async (_input: string | URL | Request, init?: RequestInit) => {
      body = String(init?.body);
      return jsonResponse({
        data: { Id: "ABC123", Timestamp: "2026-07-25T10:00:00Z" },
        success: true,
      });
    }) as typeof fetch;

    const result = await createWuzapiAdapter(
      wuzapiCredentials,
      fetcher,
    ).sendTextMessage?.({
      recipient: "+55 (21) 99999-9999",
      text: "Mensagem Wuzapi",
      trackingId: "abc-123",
    });

    expect(JSON.parse(body)).toEqual({
      Body: "Mensagem Wuzapi",
      Id: "ABC123",
      Phone: "5521999999999",
    });
    expect(result).toEqual({ externalMessageId: "ABC123" });
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
