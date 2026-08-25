import { getEntitlements } from "@/features/billing/entitlements";
import { MembersWorkspace } from "@/features/members/members-workspace";
import {
  getOrganizationOwnerId,
  listOrganizationMembers,
} from "@/features/members/queries";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TeamSettingsPage() {
  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const [entitlements, ownerId] = await Promise.all([
    getEntitlements(supabase, workspace.organization.id),
    getOrganizationOwnerId(supabase, workspace.organization.id),
  ]);
  const members = await listOrganizationMembers(
    supabase,
    workspace.organization.id,
    ownerId,
  );

  return (
    <MembersWorkspace
      canManage={workspace.membership.role === "owner" || workspace.membership.role === "admin"}
      memberLimit={entitlements.plan.limits.users}
      members={members}
      organizationName={workspace.organization.name}
    />
  );
}
