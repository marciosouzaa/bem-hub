const defaultProductionAppUrl = "http://bem-hub.vercel.app/app";

export function getInvitationRedirectToUrl() {
  const appUrl = new URL(
    process.env.BEM_HUB_PRODUCTION_APP_URL ?? defaultProductionAppUrl,
  );
  const appPath = appUrl.pathname.replace(/\/$/, "") || "/app";
  const callbackUrl = new URL("/auth/callback", appUrl.origin);

  callbackUrl.searchParams.set("next", `${appPath}/invitations/accept`);
  return callbackUrl.toString();
}
