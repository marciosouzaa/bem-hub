import { describe, expect, test } from "bun:test";
import {
  getSupportRealtimeTopic,
  SUPPORT_REALTIME_EVENT,
} from "@/features/support/realtime";

describe("support realtime contract", () => {
  test("uses one private topic per organization", () => {
    expect(
      getSupportRealtimeTopic("a0000000-0000-0000-0000-000000000001"),
    ).toBe("org:a0000000-0000-0000-0000-000000000001:support");
  });

  test("keeps a provider-neutral invalidation event", () => {
    expect(SUPPORT_REALTIME_EVENT).toBe("support.inbox.changed");
  });
});
