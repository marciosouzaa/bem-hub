const defaultProductionAppUrl = "https://bem-hub.vercel.app/app";

export function getInvitationRedirectToUrl() {
  const appUrl = new URL(
    process.env.BEM_HUB_PRODUCTION_APP_URL ?? defaultProductionAppUrl,
  );
  return new URL("/auth/invite", appUrl.origin).toString();
}
