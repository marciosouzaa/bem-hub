import { redirect } from "next/navigation";

import { setSelectedOrganizationId } from "@/features/organizations/workspace-cookie";
import { getInvitationAcceptanceResultPath } from "@/features/members/invitation-flow";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  const { data: organizationId, error } = await supabase.rpc(
    "accept_organization_member_invitation",
  );

  if (error || !organizationId) {
    redirect(getInvitationAcceptanceResultPath(false));
  }

  await setSelectedOrganizationId(organizationId);
  const isFirstAccess = user.user_metadata.invited_by_product === "BEM HUB";
  redirect(getInvitationAcceptanceResultPath(true, isFirstAccess));
}
