import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type OrganizationMemberItem = {
  userId: string;
  name: string;
  email: string;
  role: Database["public"]["Enums"]["organization_role"];
  status: Database["public"]["Enums"]["member_status"];
  isOwner: boolean;
};

export async function listOrganizationMembers(
  supabase: Supabase,
  organizationId: string,
  ownerId: string,
): Promise<OrganizationMemberItem[]> {
  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("user_id,role,status,created_at")
    .eq("organization_id", organizationId)
    .order("created_at");

  if (error) throw new Error(`Falha ao listar membros: ${error.message}`);
  if (!memberships.length) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,name,email")
    .in("id", memberships.map((membership) => membership.user_id));

  if (profileError) throw new Error(`Falha ao listar perfis: ${profileError.message}`);
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return memberships.map((membership) => {
    const profile = profilesById.get(membership.user_id);
    return {
      userId: membership.user_id,
      name: profile?.name ?? "Usuario BEM HUB",
      email: profile?.email ?? "E-mail indisponivel",
      role: membership.role,
      status: membership.status,
      isOwner: membership.user_id === ownerId,
    };
  });
}
