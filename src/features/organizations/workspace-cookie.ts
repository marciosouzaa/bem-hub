import { cookies } from "next/headers";

export const workspaceCookieName = "bem_hub_active_organization";

export async function getSelectedOrganizationId() {
  const cookieStore = await cookies();
  return cookieStore.get(workspaceCookieName)?.value ?? null;
}

export async function setSelectedOrganizationId(organizationId: string) {
  const cookieStore = await cookies();
  cookieStore.set(workspaceCookieName, organizationId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSelectedOrganizationId() {
  const cookieStore = await cookies();
  cookieStore.delete(workspaceCookieName);
}
