"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { listUserWorkspaceOptions } from "@/features/organizations/bootstrap";
import {
  clearSelectedOrganizationId,
  getSelectedOrganizationId,
  setSelectedOrganizationId,
} from "@/features/organizations/workspace-cookie";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type WorkspaceMutationResult =
  | { ok: true; message: string; signedOut?: boolean }
  | { ok: false; message: string };

const organizationIdSchema = z.string().uuid();

export async function switchLinkedEnvironmentAction(
  organizationId: string,
): Promise<WorkspaceMutationResult> {
  const parsed = organizationIdSchema.safeParse(organizationId);
  if (!parsed.success) return { ok: false, message: "Conta invalida." };

  const { supabase, user } = await getCurrentUser();
  const workspaces = await listUserWorkspaceOptions(supabase, user.id);
  const workspace = workspaces.find(
    (option) => option.organization.id === parsed.data,
  );

  if (!workspace) {
    return { ok: false, message: "Voce nao tem acesso ativo a esta conta." };
  }

  await setSelectedOrganizationId(workspace.organization.id);
  revalidateWorkspacePaths();
  return { ok: true, message: `${workspace.organization.name} esta em uso.` };
}

export async function unlinkLinkedEnvironmentAction(
  organizationId: string,
): Promise<WorkspaceMutationResult> {
  const parsed = organizationIdSchema.safeParse(organizationId);
  if (!parsed.success) return { ok: false, message: "Conta invalida." };

  const { supabase, user } = await getCurrentUser();
  const workspaces = await listUserWorkspaceOptions(supabase, user.id);
  const workspace = workspaces.find(
    (option) => option.organization.id === parsed.data,
  );

  if (!workspace || workspace.role === "owner" || workspace.organization.ownerId === user.id) {
    return { ok: false, message: "O owner nao pode se desvincular desta conta." };
  }

  const selectedOrganizationId = await getSelectedOrganizationId();
  const { error } = await supabase.rpc("leave_organization_membership", {
    target_organization_id: workspace.organization.id,
  });

  if (error) {
    return { ok: false, message: "Nao foi possivel desvincular esta conta." };
  }

  const remainingWorkspaces = await listUserWorkspaceOptions(supabase, user.id);
  if (remainingWorkspaces.length === 0) {
    await clearSelectedOrganizationId();
    await supabase.auth.signOut();
    revalidateWorkspacePaths();
    return {
      ok: true,
      message: "Conta desvinculada. Sua sessao foi encerrada.",
      signedOut: true,
    };
  }

  if (selectedOrganizationId === workspace.organization.id) {
    await setSelectedOrganizationId(remainingWorkspaces[0].organization.id);
  }

  revalidateWorkspacePaths();
  return { ok: true, message: "Conta desvinculada." };
}

async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/auth/login");
  return { supabase, user };
}

function revalidateWorkspacePaths() {
  revalidatePath("/app");
  revalidatePath("/app/settings/account");
}
