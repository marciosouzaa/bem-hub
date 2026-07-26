import { describe, expect, test } from "bun:test";

import {
  canStartSupportConversation,
  supportConversationStartRequestSchema,
} from "@/features/support/start-support-conversation-contracts";

const channelConnectionId = "11111111-1111-4111-8111-111111111111";
const clientRequestId = "22222222-2222-4222-8222-222222222222";

describe("início de atendimento", () => {
  test("aceita primeira mensagem para contato brasileiro", () => {
    const parsed = supportConversationStartRequestSchema.parse({
      channelConnectionId,
      clientRequestId,
      contactName: "Cliente",
      contactPhone: "+55 (21) 99676-3611",
      message: "Olá! Posso ajudar?",
    });

    expect(parsed.contactPhone).toBe("+55 (21) 99676-3611");
    expect(parsed.message).toBe("Olá! Posso ajudar?");
  });

  test("rejeita telefone que não produz identidade de envio", () => {
    expect(supportConversationStartRequestSchema.safeParse({
      channelConnectionId,
      clientRequestId,
      contactName: "",
      contactPhone: "123",
      message: "Olá",
    }).success).toBe(false);
  });

  test("Evolution e Wuzapi conectados ficam disponíveis", () => {
    expect(canStartSupportConversation({
      hasCredentials: true,
      provider: "evolution",
      status: "connected",
    })).toBe(true);
    expect(canStartSupportConversation({
      hasCredentials: true,
      provider: "wuzapi",
      status: "connected",
    })).toBe(true);
  });

  test("canal desconectado ou sem credenciais fica bloqueado", () => {
    expect(canStartSupportConversation({
      hasCredentials: true,
      provider: "evolution",
      status: "disconnected",
    })).toBe(false);
    expect(canStartSupportConversation({
      hasCredentials: false,
      provider: "wuzapi",
      status: "connected",
    })).toBe(false);
  });
});
