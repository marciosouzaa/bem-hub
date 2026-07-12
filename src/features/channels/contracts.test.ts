import { describe, expect, test } from "bun:test";
import { buildChannelIdempotencyKey, canTransitionAssistedReply, inboundChannelMessageSchema } from "./contracts";

describe("channel contracts", () => {
  test("normalizes idempotency", () => expect(buildChannelIdempotencyKey({ channel: " WhatsApp ", providerMessageId: " abc " })).toBe("whatsapp:abc"));
  test("requires provider IDs", () => expect(inboundChannelMessageSchema.safeParse({ channel: "whatsapp", text: "Oi" }).success).toBe(false));
  test("requires approval before send", () => {
    expect(canTransitionAssistedReply("draft", "sent")).toBe(false);
    expect(canTransitionAssistedReply("draft", "approved")).toBe(true);
    expect(canTransitionAssistedReply("approved", "sent")).toBe(true);
  });
  test("keeps terminal states immutable", () => expect(canTransitionAssistedReply("sent", "draft")).toBe(false));
});
