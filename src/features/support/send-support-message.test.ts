import { describe, expect, test } from "bun:test";

import {
  retrySupportMessageSchema,
  supportMessageRequestSchema,
} from "@/features/support/support-message-contracts";

const requestId = "11111111-1111-4111-8111-111111111111";
const messageId = "22222222-2222-4222-8222-222222222222";

describe("support message request", () => {
  test("separa envio novo de retry explícito", () => {
    expect(supportMessageRequestSchema.parse({
      action: "retry",
      clientRequestId: requestId,
      messageId,
    })).toEqual({
      action: "retry",
      clientRequestId: requestId,
      messageId,
    });
  });

  test("retry exige uma nova chave idempotente válida", () => {
    expect(retrySupportMessageSchema.safeParse({
      clientRequestId: "same-button-click",
      messageId,
    }).success).toBe(false);
  });

  test("não aceita conteúdo de novo envio no contrato de retry", () => {
    expect(supportMessageRequestSchema.safeParse({
      action: "retry",
      clientRequestId: requestId,
      content: "duplicar sem intenção",
      conversationId: messageId,
    }).success).toBe(false);
  });
});
