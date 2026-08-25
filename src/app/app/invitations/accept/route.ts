import { redirect } from "next/navigation";

import { setSelectedOrganizationId } from "@/features/organizations/workspace-cookie";
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
    redirect("/auth/invitation-accepted?status=error");
  }

  await setSelectedOrganizationId(organizationId);
  redirect("/auth/invitation-accepted?status=accepted");
}
