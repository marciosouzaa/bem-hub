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
      senderPhone: "+5511999999999",
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
      senderPhone: "+5511888888888",
      text: "Quero falar com atendimento.",
    });
  });

  test("preserva outro DDI sem interromper a normalização", () => {
    const events = verifyAndNormalizeUazapiWebhook({
      expectedInstanceId: null,
      headers: new Headers(),
      payload: {
        event: "messages",
        message: {
          chatid: "14155552671@s.whatsapp.net",
          messageid: "message-international-001",
          pushName: "International contact",
          text: "Hello",
        },
      },
      rawBody: "{}",
    }, instanceToken);

    expect(events[0]).toMatchObject({
      senderIdentityType: "phone",
      senderIdentityValue: "14155552671",
      senderPhone: "+14155552671",
      type: "message.received",
    });
  });

  test("normaliza saída manual e ignora grupo e mensagem enviada pela API", () => {
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

    expect(events).toEqual([{
      occurredAt: expect.any(String),
      providerMessageId: "message-001",
      senderIdentityType: "phone",
      senderIdentityValue: "5511999999999",
      senderName: null,
      senderPhone: "+5511999999999",
      text: "Ignorar",
      type: "message.sent_by_phone",
    }]);
  });

  test("normaliza confirmações de entrega e leitura", () => {
    const events = verifyAndNormalizeUazapiWebhook({
      expectedInstanceId: "instance-test",
      headers: new Headers(),
      payload: {
        event: "messages_update",
        instance: { id: "instance-test" },
        messages: [
          {
            messageTimestamp: 1_750_000_000,
            messageid: "provider-message-001",
            status: "Delivered",
            wasSentByApi: true,
          },
          {
            messageTimestamp: 1_750_000_100,
            messageid: "provider-message-002",
            status: "Read",
            wasSentByApi: true,
          },
        ],
      },
      rawBody: "{}",
    }, instanceToken);

    expect(events).toEqual([
      {
        deliveryStatus: "delivered",
        eventId: "provider-message-001:delivered",
        occurredAt: "2025-06-15T15:06:40.000Z",
        providerMessageId: "provider-message-001",
        type: "message.delivery_updated",
      },
      {
        deliveryStatus: "read",
        eventId: "provider-message-002:read",
        occurredAt: "2025-06-15T15:08:20.000Z",
        providerMessageId: "provider-message-002",
        type: "message.delivery_updated",
      },
    ]);
  });

  test("aceita status textual aninhado sem recriar a mensagem", () => {
    const events = verifyAndNormalizeUazapiWebhook({
      expectedInstanceId: null,
      headers: new Headers(),
      payload: {
        data: {
          key: { id: "provider-message-003" },
          update: { status: "Sent" },
        },
        event: "messages_update",
        timestamp: 1_750_000_000_000,
      },
      rawBody: "{}",
    }, instanceToken);

    expect(events).toEqual([{
      deliveryStatus: "sent",
      eventId: "provider-message-003:sent",
      occurredAt: "2025-06-15T15:06:40.000Z",
      providerMessageId: "provider-message-003",
      type: "message.delivery_updated",
    }]);
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
