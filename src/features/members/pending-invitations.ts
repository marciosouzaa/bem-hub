import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type PendingOrganizationInvitation = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: Database["public"]["Enums"]["organization_role"];
};

export async function listMyPendingOrganizationInvitations(
  supabase: Supabase,
): Promise<PendingOrganizationInvitation[]> {
  const { data, error } = await supabase.rpc(
    "list_my_pending_organization_member_invitations",
  );

  if (error) {
    throw new Error(`Falha ao buscar convites pendentes: ${error.message}`);
  }

  return data.map((invitation) => ({
    organizationId: invitation.organization_id,
    organizationName: invitation.organization_name,
    organizationSlug: invitation.organization_slug,
    role: invitation.role,
  }));
}
