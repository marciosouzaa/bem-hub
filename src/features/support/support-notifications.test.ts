import { describe, expect, test } from "bun:test";

import {
  readSupportSoundPreference,
  shouldPlaySupportSoundNotification,
  writeSupportSoundPreference,
  type SupportRealtimePayload,
} from "@/features/support/support-notifications";

const viewerId = "10000000-0000-0000-0000-000000000001";
const now = new Date("2026-08-19T10:00:00.000Z");

describe("support sound notifications", () => {
  test("requires an enabled preference", () => {
    expect(shouldPlaySupportSoundNotification(basePayload(), {
      now,
      preference: "disabled",
      viewerId,
    })).toBe(false);
  });

  test("plays for fresh inbound messages assigned to viewer or unassigned", () => {
    expect(shouldPlaySupportSoundNotification(basePayload({
      conversationAssignedTo: viewerId,
    }), {
      now,
      preference: "enabled",
      viewerId,
    })).toBe(true);
    expect(shouldPlaySupportSoundNotification(basePayload({
      conversationAssignedTo: null,
    }), {
      now,
      preference: "enabled",
      viewerId,
    })).toBe(true);
  });

  test("rejects own, outbound, historical, sync and other-assignee events", () => {
    const context = { now, preference: "enabled" as const, viewerId };
    expect(shouldPlaySupportSoundNotification(basePayload({
      messageActorId: viewerId,
    }), context)).toBe(false);
    expect(shouldPlaySupportSoundNotification(basePayload({
      messageDirection: "outbound",
    }), context)).toBe(false);
    expect(shouldPlaySupportSoundNotification(basePayload({
      messageCreatedAt: "2026-08-19T09:00:00.000Z",
    }), context)).toBe(false);
    expect(shouldPlaySupportSoundNotification(basePayload({
      messageSource: "historical_import",
    }), context)).toBe(false);
    expect(shouldPlaySupportSoundNotification(basePayload({
      conversationAssignedTo: "20000000-0000-0000-0000-000000000002",
    }), context)).toBe(false);
  });

  test("persists browser preference", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };

    expect(readSupportSoundPreference(storage)).toBe("disabled");
    writeSupportSoundPreference("enabled", storage);
    expect(readSupportSoundPreference(storage)).toBe("enabled");
  });
});

function basePayload(
  overrides: Partial<SupportRealtimePayload> = {},
): SupportRealtimePayload {
  return {
    conversationAssignedTo: null,
    entity: "support_messages",
    messageActorId: null,
    messageCreatedAt: now.toISOString(),
    messageDirection: "inbound",
    messageSource: "whatsapp_contact",
    messageStatus: "received",
    occurredAt: now.toISOString(),
    operation: "insert",
    ...overrides,
  };
}
