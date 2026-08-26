export type InvitationSessionTransition =
  | { code: string; kind: "code" }
  | { accessToken: string; kind: "session"; refreshToken: string }
  | { kind: "none" };

export function getInvitationSessionTransition(input: {
  hash: string;
  search: string;
}): InvitationSessionTransition {
  const search = new URLSearchParams(input.search);
  const code = search.get("code");
  if (code) return { code, kind: "code" };

  const hash = new URLSearchParams(input.hash.replace(/^#/, ""));
  const type = hash.get("type");
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");

  if (
    (type === "invite" || type === "magiclink")
    && accessToken
    && refreshToken
  ) {
    return { accessToken, kind: "session", refreshToken };
  }

  return { kind: "none" };
}
