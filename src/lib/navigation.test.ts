import { describe, expect, test } from "bun:test";

import { getLoginPath, sanitizeInternalPath } from "@/lib/navigation";

describe("internal navigation", () => {
  test("keeps a valid invitation acceptance path", () => {
    const next = sanitizeInternalPath("/app/invitations/accept");

    expect(next).toBe("/app/invitations/accept");
    expect(getLoginPath(next)).toBe(
      "/auth/login?next=%2Fapp%2Finvitations%2Faccept",
    );
  });

  test("rejects external and protocol-relative redirects", () => {
    expect(sanitizeInternalPath("https://example.com")).toBe("/app");
    expect(sanitizeInternalPath("//example.com")).toBe("/app");
  });
});
