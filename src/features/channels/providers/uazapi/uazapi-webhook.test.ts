import { describe, expect, test } from "bun:test";

import { verifyAndNormalizeUazapiWebhook } from "@/features/channels/providers/uazapi/uazapi-webhook";
import { ChannelWebhookVerificationError } from "@/features/channels/webhooks/contracts";

const instanceToken = "test-instance-token";

describe("Uazapi webhook", () => {
  test("normaliza o contrato atual para o evento interno", () => {
    const events = verifyAndNormalizeUazapiWebhook({
      expectedInstanceId: "instance-test",
      headers: new Headers(),
      payload: {
        data: {
          chatid: "5511999999999@s.whatsapp.net",
          fromMe: false,
          isGroup: false,
          messageTimestamp: 1_750_000_000,
          messageid: "message-001",
          senderName: "Ana",
          sender_pn: "5511999999999@s.whatsapp.net",
          text: "Olá, preciso de ajuda.",
        },
        event: "messages",
        instance: "instance-test",
        token: instanceToken,
      },
      rawBody: "{}",
    }, instanceToken);

    expect(events).toEqual([{
      occurredAt: "2025-06-15T15:06:40.000Z",
      providerMessageId: "message-001",
      senderIdentityType: "phone",
      senderIdentityValue: "5511999999999",
      senderName: "Ana",
      senderPhone: "5511999999999",
      text: "Olá, preciso de ajuda.",
      type: "message.received",
    }]);
  });

  test("aceita o payload legado e texto aninhado", () => {
    const events = verifyAndNormalizeUazapiWebhook({
      expectedInstanceId: null,
      headers: new Headers(),
      payload: {
        EventType: "messages",
        message: {
          chatId: "5511888888888@s.whatsapp.net",
          content: { conversation: "Quero falar com atendimento." },
          messageId: "message-legacy-001",
          pushName: "Bruno",
        },
        token: instanceToken,
      },
      rawBody: "{}",
    }, instanceToken);

    expect(events[0]).toMatchObject({
      providerMessageId: "message-legacy-001",
      senderName: "Bruno",
      senderPhone: "5511888888888",
      text: "Quero falar com atendimento.",
    });
  });

  test("ignora saída, grupo e mensagem enviada pela API", () => {
    const baseMessage = {
      chatid: "5511999999999@s.whatsapp.net",
      messageid: "message-001",
      text: "Ignorar",
    };
    const events = verifyAndNormalizeUazapiWebhook({
      expectedInstanceId: null,
      headers: new Headers(),
      payload: {
        event: "messages",
        messages: [
          { ...baseMessage, fromMe: true },
          { ...baseMessage, chatid: "123@g.us", messageid: "message-002" },
          { ...baseMessage, messageid: "message-003", wasSentByApi: true },
        ],
      },
      rawBody: "{}",
    }, instanceToken);

    expect(events).toEqual([]);
  });

  test("rejeita token ou instância divergentes", () => {
    expect(() => verifyAndNormalizeUazapiWebhook({
      expectedInstanceId: null,
      headers: new Headers(),
      payload: { event: "messages", token: "wrong-token" },
      rawBody: "{}",
    }, instanceToken)).toThrow(ChannelWebhookVerificationError);

    expect(() => verifyAndNormalizeUazapiWebhook({
      expectedInstanceId: "expected",
      headers: new Headers(),
      payload: { event: "messages", instance: "other" },
      rawBody: "{}",
    }, instanceToken)).toThrow(ChannelWebhookVerificationError);
  });
});
