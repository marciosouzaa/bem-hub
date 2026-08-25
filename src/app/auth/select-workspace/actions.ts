"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { listUserWorkspaceOptions } from "@/features/organizations/bootstrap";
import { setSelectedOrganizationId } from "@/features/organizations/workspace-cookie";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const selectWorkspaceSchema = z.object({
  next: z.string().optional(),
  organizationId: z.string().uuid(),
});

export async function selectWorkspaceAction(input: unknown) {
  const parsed = selectWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Conta invalida." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const workspaces = await listUserWorkspaceOptions(supabase, user.id);
  const workspace = workspaces.find(
    (option) => option.organization.id === parsed.data.organizationId,
  );

  if (!workspace) {
    return { ok: false, message: "Voce nao tem acesso ativo a esta conta." };
  }

  await setSelectedOrganizationId(workspace.organization.id);
  redirect(sanitizeNext(parsed.data.next));
}

function sanitizeNext(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/app";
  }

  return next;
}
