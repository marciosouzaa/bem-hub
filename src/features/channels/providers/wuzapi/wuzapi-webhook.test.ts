import { createHmac } from "crypto";
import { describe, expect, test } from "bun:test";

import { verifyAndNormalizeWuzapiWebhook } from "@/features/channels/providers/wuzapi/wuzapi-webhook";
import { ChannelWebhookVerificationError } from "@/features/channels/webhooks/contracts";

const hmacKey = "wuzapi-hmac-key-with-more-than-32-characters";

describe("Wuzapi webhook", () => {
  test("valida HMAC e normaliza mensagem recebida", () => {
    const payload = {
      event: {
        Info: {
          Chat: "5521999999999@s.whatsapp.net",
          ID: "message-001",
          IsFromMe: false,
          IsGroup: false,
          PushName: "Ana",
          Sender: "5521999999999@s.whatsapp.net",
          Timestamp: "2026-07-25T10:00:00Z",
        },
        Message: { conversation: "Preciso de ajuda." },
      },
      type: "Message",
      userID: "1",
    };
    const input = signedInput(payload);

    const events = verifyAndNormalizeWuzapiWebhook(input, hmacKey);

    expect(events).toEqual([{
      occurredAt: "2026-07-25T10:00:00.000Z",
      providerMessageId: "message-001",
      senderIdentityType: "phone",
      senderIdentityValue: "5521999999999",
      senderName: "Ana",
      senderPhone: "+5521999999999",
      text: "Preciso de ajuda.",
      type: "message.received",
    }]);
  });

  test("prioriza telefone alternativo para mensagem recebida por LID", () => {
    const payload = {
      event: {
        Info: {
          Chat: "80620915011752@lid",
          ID: "message-lid-inbound",
          IsFromMe: false,
          IsGroup: false,
          PushName: "Ana",
          Sender: "80620915011752:12@lid",
          SenderAlt: "5521964827715:12@s.whatsapp.net",
          Timestamp: "2026-07-25T10:00:00Z",
        },
        Message: { conversation: "Mensagem recebida." },
      },
      type: "Message",
      userID: "1",
    };

    const [event] = verifyAndNormalizeWuzapiWebhook(
      signedInput(payload),
      hmacKey,
    );

    expect(event).toMatchObject({
      senderIdentityType: "phone",
      senderIdentityValue: "5521964827715",
      senderName: "Ana",
      senderPhone: "+5521964827715",
      type: "message.received",
    });
  });

  test("normaliza mídia Base64 entregue pelo webhook", () => {
    const [event] = verifyAndNormalizeWuzapiWebhook(signedInput({
      base64: "aGVsbG8=",
      event: {
        Info: {
          Chat: "5521999999999@s.whatsapp.net", ID: "media-001", IsFromMe: false,
          IsGroup: false, Sender: "5521999999999@s.whatsapp.net", Timestamp: "2026-07-25T10:00:00Z",
        },
        Message: { ImageMessage: { Caption: "Imagem", Mimetype: "image/png" } },
      },
      fileName: "imagem.png",
      mimeType: "image/png",
      type: "Message",
    }), hmacKey);

    expect(event).toMatchObject({
      media: { dataBase64: "aGVsbG8=", fileName: "imagem.png", mediaType: "image", mimeType: "image/png" },
      providerMessageId: "media-001",
      text: "Imagem",
      type: "message.received",
    });
  });

  test("usa telefone do destinatário em mensagem enviada pelo aparelho", () => {
    const payload = {
      event: {
        Info: {
          Chat: "80620915011752@lid",
          ID: "message-lid-outbound",
          IsFromMe: true,
          IsGroup: false,
          PushName: "Nome da conta conectada",
          RecipientAlt: "5521964827715@s.whatsapp.net",
          Sender: "123456789:34@lid",
          Timestamp: "2026-07-25T10:00:00Z",
        },
        Message: { conversation: "Mensagem enviada." },
      },
      type: "Message",
      userID: "1",
    };

    const [event] = verifyAndNormalizeWuzapiWebhook(
      signedInput(payload),
      hmacKey,
    );

    expect(event).toMatchObject({
      senderIdentityType: "phone",
      senderIdentityValue: "5521964827715",
      senderName: null,
      senderPhone: "+5521964827715",
      type: "message.sent_by_phone",
    });
  });

  test("normaliza confirmações para todos os IDs", () => {
    const payload = {
      event: {
        MessageIDs: ["message-001", "message-002"],
        Timestamp: "2026-07-25T10:01:00Z",
      },
      state: "Read",
      type: "ReadReceipt",
      userID: "1",
    };

    const events = verifyAndNormalizeWuzapiWebhook(signedInput(payload), hmacKey);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      deliveryStatus: "read",
      providerMessageId: "message-001",
    });
    expect(events[1]).toMatchObject({
      deliveryStatus: "read",
      providerMessageId: "message-002",
    });
  });

  test("rejeita assinatura ausente ou divergente", () => {
    const rawBody = JSON.stringify({ type: "Message" });
    expect(() => verifyAndNormalizeWuzapiWebhook({
      expectedInstanceId: null,
      headers: new Headers(),
      payload: { type: "Message" },
      rawBody,
    }, hmacKey)).toThrow(ChannelWebhookVerificationError);
  });
});

function signedInput(payload: unknown) {
  const rawBody = JSON.stringify(payload);
  const signature = createHmac("sha256", hmacKey)
    .update(rawBody, "utf8")
    .digest("hex");
  return {
    expectedInstanceId: null,
    headers: new Headers({ "x-hmac-signature": signature }),
    payload,
    rawBody,
  };
}
