import { afterEach, describe, expect, test } from "bun:test";

import { getInvitationRedirectToUrl } from "@/features/members/invitation-url";

const originalAppUrl = process.env.BEM_HUB_PRODUCTION_APP_URL;

afterEach(() => {
  if (originalAppUrl === undefined) {
    delete process.env.BEM_HUB_PRODUCTION_APP_URL;
    return;
  }

  process.env.BEM_HUB_PRODUCTION_APP_URL = originalAppUrl;
});

describe("invitation redirect URL", () => {
  test("uses the HTTPS production fallback", () => {
    delete process.env.BEM_HUB_PRODUCTION_APP_URL;

    expect(getInvitationRedirectToUrl()).toBe(
      "https://bem-hub.vercel.app/auth/invite",
    );
  });

  test("uses the invite bridge on the configured application origin", () => {
    process.env.BEM_HUB_PRODUCTION_APP_URL = "https://staging.example.com/workspace/";

    expect(getInvitationRedirectToUrl()).toBe(
      "https://staging.example.com/auth/invite",
    );
  });
});
