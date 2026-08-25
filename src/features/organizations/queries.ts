import { redirect } from "next/navigation";
import { cache } from "react";
import {
  ensureUserProfile,
  getOrCreateWorkspace,
  listUserWorkspaceOptions,
} from "@/features/organizations/bootstrap";
import { getSelectedOrganizationId } from "@/features/organizations/workspace-cookie";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getRequiredWorkspace = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  await ensureUserProfile(supabase, user);

  const selectedOrganizationId = await getSelectedOrganizationId();
  const workspaces = await listUserWorkspaceOptions(supabase, user.id);
  const selectedWorkspace = selectedOrganizationId
    ? workspaces.find(
        (workspace) => workspace.organization.id === selectedOrganizationId,
      )
    : null;

  if (workspaces.length > 1 && !selectedWorkspace) {
    redirect("/auth/select-workspace?next=/app");
  }

  return getOrCreateWorkspace(supabase, {
    selectedOrganizationId: selectedWorkspace?.organization.id ?? null,
    user,
  });
});
