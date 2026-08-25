import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type WorkspaceContext = {
  user: User;
  profile: {
    id: string;
    name: string | null;
    email: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  membership: {
    role: Database["public"]["Enums"]["organization_role"];
  };
};

export type WorkspaceOption = {
  organization: {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
  };
  role: Database["public"]["Enums"]["organization_role"];
};

type BootstrapInput = {
  user: User;
  selectedOrganizationId?: string | null;
  organizationName?: string | null;
};

export async function getOrCreateWorkspace(
  supabase: Supabase,
  input: BootstrapInput,
): Promise<WorkspaceContext> {
  const profile = await ensureUserProfile(supabase, input.user);
  const existingWorkspace = await getSelectedOrFirstWorkspace(
    supabase,
    input.user,
    input.selectedOrganizationId,
  );

  if (existingWorkspace) {
    return {
      user: input.user,
      profile,
      ...existingWorkspace,
    };
  }

  const ownedWorkspace = await getOwnedWorkspaceWithoutMembership(
    supabase,
    input.user,
  );

  if (ownedWorkspace) {
    await bootstrapOwnedOrganization(supabase, ownedWorkspace.organization.id);

    return {
      user: input.user,
      profile,
      organization: ownedWorkspace.organization,
      membership: {
        role: "owner",
      },
    };
  }

  const organizationName =
    input.organizationName?.trim() ||
    getUserOrganizationName(input.user) ||
    "Minha empresa";
  const organizationId = crypto.randomUUID();
  const slug = buildOrganizationSlug(organizationName);

  const { error: organizationError } = await supabase
    .from("organizations")
    .insert({
      id: organizationId,
      name: organizationName,
      slug,
      owner_id: input.user.id,
    });

  if (organizationError) {
    throw new Error(`Falha ao criar organizacao: ${organizationError.message}`);
  }

  await bootstrapOwnedOrganization(supabase, organizationId);

  return {
    user: input.user,
    profile,
    organization: {
      id: organizationId,
      name: organizationName,
      slug,
    },
    membership: {
      role: "owner",
    },
  };
}

export async function ensureUserProfile(supabase: Supabase, user: User) {
  const email = user.email ?? null;
  const name = getUserName(user);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        name,
        email,
        avatar_url: null,
      },
      { onConflict: "id" },
    )
    .select("id,name,email")
    .single();

  if (profileError) {
    throw new Error(`Falha ao salvar perfil: ${profileError.message}`);
  }

  return profile;
}

export async function listUserWorkspaceOptions(
  supabase: Supabase,
  userId: string,
): Promise<WorkspaceOption[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at");

  if (membershipError) {
    throw new Error(`Falha ao buscar memberships: ${membershipError.message}`);
  }

  if (!memberships.length) return [];

  const { data: organizations, error: organizationError } = await supabase
    .from("organizations")
    .select("id,name,slug,owner_id")
    .in("id", memberships.map((membership) => membership.organization_id));

  if (organizationError) {
    throw new Error(`Falha ao buscar organizacoes: ${organizationError.message}`);
  }

  const organizationsById = new Map(
    organizations.map((organization) => [organization.id, organization]),
  );

  return memberships
    .map((membership) => {
      const organization = organizationsById.get(membership.organization_id);
      if (!organization) return null;
      return {
        organization: {
          id: organization.id,
          name: organization.name,
          ownerId: organization.owner_id,
          slug: organization.slug,
        },
        role: membership.role,
      };
    })
    .filter((option): option is WorkspaceOption => option !== null)
    .sort((first, second) => {
      const firstRank = getWorkspaceRoleRank(first.role);
      const secondRank = getWorkspaceRoleRank(second.role);
      if (firstRank !== secondRank) return firstRank - secondRank;
      return first.organization.name.localeCompare(second.organization.name, "pt-BR");
    });
}

async function getOwnedWorkspaceWithoutMembership(supabase: Supabase, user: User) {
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id,name,slug")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar organizacao owner: ${error.message}`);
  }

  if (!organization) {
    return null;
  }

  return { organization };
}

async function bootstrapOwnedOrganization(
  supabase: Supabase,
  organizationId: string,
) {
  const { error } = await supabase.rpc("bootstrap_owned_organization", {
    target_organization_id: organizationId,
  });

  if (error) {
    throw new Error(`Falha ao configurar workspace: ${error.message}`);
  }
}

async function getSelectedOrFirstWorkspace(
  supabase: Supabase,
  user: User,
  selectedOrganizationId?: string | null,
) {
  const workspaces = await listUserWorkspaceOptions(supabase, user.id);
  if (!workspaces.length) {
    return null;
  }

  const selected = selectedOrganizationId
    ? workspaces.find(
        (workspace) => workspace.organization.id === selectedOrganizationId,
      )
    : null;
  const workspace = selected ?? workspaces[0];

  return {
    organization: {
      id: workspace.organization.id,
      name: workspace.organization.name,
      slug: workspace.organization.slug,
    },
    membership: {
      role: workspace.role,
    },
  };
}

function getWorkspaceRoleRank(role: Database["public"]["Enums"]["organization_role"]) {
  if (role === "owner") return 0;
  if (role === "admin") return 1;
  return 2;
}

function getUserName(user: User) {
  const metadataName = user.user_metadata?.name;

  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  return user.email?.split("@")[0] ?? null;
}

function getUserOrganizationName(user: User) {
  const organizationName = user.user_metadata?.organization_name;

  if (typeof organizationName === "string" && organizationName.trim()) {
    return organizationName.trim();
  }

  return null;
}

function buildOrganizationSlug(name: string) {
  const base =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "empresa";

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}
