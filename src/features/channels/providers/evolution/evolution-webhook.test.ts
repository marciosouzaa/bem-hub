import { describe, expect, test } from "bun:test";

import {
  createEvolutionWebhookSecret,
  verifyAndNormalizeEvolutionWebhook,
} from "@/features/channels/providers/evolution/evolution-webhook";
import { ChannelWebhookVerificationError } from "@/features/channels/webhooks/contracts";

const apiKey = "evolution-api-key-for-tests";

describe("Evolution API webhook", () => {
  test("normaliza mensagem recebida", () => {
    const events = verifyAndNormalizeEvolutionWebhook({
      expectedInstanceId: "bem-hub-test",
      headers: webhookHeaders(),
      payload: {
        apikey: apiKey,
        data: {
          key: {
            fromMe: false,
            id: "message-001",
            remoteJid: "5511999999999@s.whatsapp.net",
          },
          message: { conversation: "Preciso de ajuda." },
          messageTimestamp: 1_750_000_000,
          pushName: "Ana",
        },
        event: "messages.upsert",
        instance: "bem-hub-test",
      },
      rawBody: "{}",
    }, apiKey, "bem-hub-test");

    expect(events).toEqual([{
      occurredAt: "2025-06-15T15:06:40.000Z",
      providerMessageId: "message-001",
      senderIdentityType: "phone",
      senderIdentityValue: "5511999999999",
      senderName: "Ana",
      senderPhone: "+5511999999999",
      text: "Preciso de ajuda.",
      type: "message.received",
    }]);
  });

  test("normaliza entrega e leitura", () => {
    const events = verifyAndNormalizeEvolutionWebhook({
      expectedInstanceId: "bem-hub-test",
      headers: webhookHeaders(),
      payload: {
        apikey: apiKey,
        data: [
          { keyId: "message-001", status: "DELIVERY_ACK" },
          { keyId: "message-002", status: "READ" },
        ],
        date_time: "2026-07-25T10:00:00Z",
        event: "messages.update",
        instance: "bem-hub-test",
      },
      rawBody: "{}",
    }, apiKey, "bem-hub-test");

    expect(events).toEqual([
      {
        deliveryStatus: "delivered",
        eventId: "message-001:delivered",
        occurredAt: "2026-07-25T10:00:00.000Z",
        providerMessageId: "message-001",
        type: "message.delivery_updated",
      },
      {
        deliveryStatus: "read",
        eventId: "message-002:read",
        occurredAt: "2026-07-25T10:00:00.000Z",
        providerMessageId: "message-002",
        type: "message.delivery_updated",
      },
    ]);
  });

  test("normaliza citação recebida pelo WhatsApp", () => {
    const [event] = verifyAndNormalizeEvolutionWebhook({
      expectedInstanceId: "bem-hub-test",
      headers: webhookHeaders(),
      payload: {
        data: {
          key: { fromMe: false, id: "reply-001", remoteJid: "5511999999999@s.whatsapp.net" },
          message: {
            extendedTextMessage: {
              contextInfo: { stanzaId: "quoted-001" },
              text: "Respondendo pelo celular.",
            },
          },
          messageTimestamp: 1_750_000_000,
        },
        event: "messages.upsert",
        instance: "bem-hub-test",
      },
      rawBody: "{}",
    }, apiKey, "bem-hub-test");

    expect(event).toMatchObject({
      providerMessageId: "reply-001",
      replyToProviderMessageId: "quoted-001",
      text: "Respondendo pelo celular.",
    });
  });

  test("normaliza imagem recebida e preserva contexto só para download server-side", () => {
    const [event] = verifyAndNormalizeEvolutionWebhook({
      expectedInstanceId: "bem-hub-test",
      headers: webhookHeaders(),
      payload: {
        data: {
          key: { fromMe: false, id: "media-001", remoteJid: "5511999999999@s.whatsapp.net" },
          message: { imageMessage: { caption: "Confira", mimetype: "image/png" } },
          messageTimestamp: 1_750_000_000,
        },
        event: "messages.upsert",
        instance: "bem-hub-test",
      },
      rawBody: "{}",
    }, apiKey, "bem-hub-test");

    expect(event).toMatchObject({
      media: { fileName: null, mediaType: "image", mimeType: "image/png" },
      providerMessageId: "media-001",
      text: "Confira",
      type: "message.received",
    });
    expect(event && "media" in event && event.media?.downloadContext).toBeDefined();
  });

  test("rejeita API key ou instância divergente", () => {
    expect(() => verifyAndNormalizeEvolutionWebhook({
      expectedInstanceId: "bem-hub-test",
      headers: new Headers({ "x-bem-hub-webhook-key": "wrong" }),
      payload: {
        data: {},
        event: "messages.upsert",
        instance: "bem-hub-test",
      },
      rawBody: "{}",
    }, apiKey, "bem-hub-test")).toThrow(ChannelWebhookVerificationError);

    expect(() => verifyAndNormalizeEvolutionWebhook({
      expectedInstanceId: "bem-hub-test",
      headers: webhookHeaders(),
      payload: {
        apikey: apiKey,
        data: {},
        event: "messages.upsert",
        instance: "other",
      },
      rawBody: "{}",
    }, apiKey, "bem-hub-test")).toThrow(ChannelWebhookVerificationError);
  });
});

function webhookHeaders() {
  return new Headers({
    "x-bem-hub-webhook-key": createEvolutionWebhookSecret(
      apiKey,
      "bem-hub-test",
    ),
  });
}
