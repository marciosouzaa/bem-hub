import { describe, expect, test } from "bun:test";

import { getInvitationAcceptanceResultPath } from "@/features/members/invitation-flow";

describe("invitation acceptance result", () => {
  test("has explicit success and failure destinations", () => {
    expect(getInvitationAcceptanceResultPath(true)).toBe(
      "/auth/invitation-accepted?status=accepted",
    );
    expect(getInvitationAcceptanceResultPath(false)).toBe(
      "/auth/invitation-accepted?status=error",
    );
    expect(getInvitationAcceptanceResultPath(true, true)).toBe(
      "/auth/invitation-accepted?status=accepted&first_access=1",
    );
  });
});
