"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MemberActionState = { ok: boolean; message: string | null };

const memberSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "member"]),
});

export async function addMemberAction(
  _state: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const parsed = memberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Informe e-mail e papel validos." };
  }

  const workspace = await getRequiredWorkspace();
  if (!(["owner", "admin"] as string[]).includes(workspace.membership.role)) {
    return { ok: false, message: "Apenas administradores incluem membros." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("add_organization_member_by_email", {
    target_email: parsed.data.email,
    target_organization_id: workspace.organization.id,
    target_role: parsed.data.role,
  });

  if (error) {
    const message = error.message.includes("user_limit")
      ? "Limite de usuarios do plano atingido."
      : "Conta nao disponivel ou inclusao nao permitida.";
    return { ok: false, message };
  }

  revalidatePath("/app/settings/account");
  return { ok: true, message: "Membro incluido no workspace." };
}

export async function updateMemberRoleAction(userId: string, formData: FormData) {
  const role = z.enum(["admin", "member"]).safeParse(formData.get("role"));
  if (!role.success) throw new Error("Papel de membro invalido.");
  await manageMember(userId, role.data, "active");
}

export async function removeMemberAction(userId: string) {
  await manageMember(userId, "member", "removed");
}

async function manageMember(
  userId: string,
  role: "admin" | "member",
  status: "active" | "removed",
) {
  const workspace = await getRequiredWorkspace();
  if (!(["owner", "admin"] as string[]).includes(workspace.membership.role)) {
    throw new Error("Apenas administradores gerenciam membros.");
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("manage_organization_member", {
    target_organization_id: workspace.organization.id,
    target_user_id: userId,
    target_role: role,
    target_status: status,
  });
  if (error) throw new Error(`Falha ao gerenciar membro: ${error.message}`);
  revalidatePath("/app/settings/account");
}
