import { describe, expect, test } from "bun:test";

import { getInvitationSessionTransition } from "@/features/members/invitation-session";

describe("invitation session transition", () => {
  test("preserves a PKCE code for the server callback", () => {
    expect(getInvitationSessionTransition({ hash: "", search: "?code=pkce-code" })).toEqual({
      code: "pkce-code",
      kind: "code",
    });
  });

  test("accepts an invite session only when both browser tokens are present", () => {
    expect(getInvitationSessionTransition({
      hash: "#access_token=access&refresh_token=refresh&type=invite",
      search: "",
    })).toEqual({
      accessToken: "access",
      kind: "session",
      refreshToken: "refresh",
    });
  });

  test("does not consume unrelated or incomplete URL fragments", () => {
    expect(getInvitationSessionTransition({
      hash: "#access_token=access&type=recovery",
      search: "",
    })).toEqual({ kind: "none" });
  });
});
