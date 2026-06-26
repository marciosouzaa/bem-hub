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

type BootstrapInput = {
  user: User;
  organizationName?: string | null;
};

export async function getOrCreateWorkspace(
  supabase: Supabase,
  input: BootstrapInput,
): Promise<WorkspaceContext> {
  const email = input.user.email ?? null;
  const name = getUserName(input.user);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: input.user.id,
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

  const existingWorkspace = await getFirstWorkspace(supabase, input.user);

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

async function getFirstWorkspace(supabase: Supabase, user: User) {
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Falha ao buscar membership: ${membershipError.message}`);
  }

  if (!membership) {
    return null;
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id,name,slug")
    .eq("id", membership.organization_id)
    .single();

  if (organizationError) {
    throw new Error(
      `Falha ao buscar organizacao: ${organizationError.message}`,
    );
  }

  return {
    organization,
    membership: {
      role: membership.role,
    },
  };
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
