import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type OrganizationMemberItem = {
  acceptedAt: string | null;
  createdAt: string;
  userId: string;
  name: string;
  email: string;
  invitedAt: string | null;
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
    .select("user_id,role,status,created_at,invited_at,accepted_at")
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
      acceptedAt: membership.accepted_at,
      createdAt: membership.created_at,
      userId: membership.user_id,
      name: profile?.name ?? "Usuario BEM HUB",
      email: profile?.email ?? "E-mail indisponivel",
      invitedAt: membership.invited_at,
      role: membership.role,
      status: membership.status,
      isOwner: membership.user_id === ownerId,
    };
  });
}

export async function getOrganizationOwnerId(
  supabase: Supabase,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("organizations")
    .select("owner_id")
    .eq("id", organizationId)
    .single();

  if (error) throw new Error(`Falha ao buscar owner: ${error.message}`);
  return data.owner_id;
}
