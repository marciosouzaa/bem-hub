"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRequiredWorkspace } from "@/features/organizations/queries";
import { getInvitationRedirectToUrl } from "@/features/members/invitation-url";
import {
  memberInviteSchema,
  memberRoleFormSchema,
  type MemberInviteValues,
  type MemberRoleFormValues,
} from "@/features/members/member-schema";
import { createSupabaseAdminClient, SupabaseAdminConfigError } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MemberMutationResult =
  | { ok: true; message: string }
  | {
      ok: false;
      errors?: Partial<
        Record<keyof MemberInviteValues | keyof MemberRoleFormValues, string[]>
      >;
      message: string;
    };

const memberIdSchema = z.string().uuid();

export async function inviteMemberAction(
  input: unknown,
): Promise<MemberMutationResult> {
  const parsed = memberInviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "Revise os dados do convite.",
    };
  }

  const workspace = await getRequiredWorkspace();
  if (!canManageMembers(workspace.membership.role)) {
    return { ok: false, message: "Apenas owner e admins convidam membros." };
  }

  const supabase = await createSupabaseServerClient();
  const redirectTo = getInvitationRedirectToUrl();
  const { data: existingUserId, error: checkError } = await supabase.rpc(
    "check_organization_member_invitation",
    {
      target_email: parsed.data.email,
      target_organization_id: workspace.organization.id,
    },
  );

  if (checkError) {
    return { ok: false, message: getInvitationErrorMessage(checkError.message) };
  }

  const targetUserId = existingUserId
    ? await inviteExistingUser(existingUserId, parsed.data.email, redirectTo)
    : await inviteNewUser(parsed.data, workspace.organization.name, redirectTo);

  if (!targetUserId.ok) {
    return targetUserId;
  }

  const { error } = await supabase.rpc("create_organization_member_invitation", {
    target_email: parsed.data.email,
    target_name: parsed.data.name?.trim() || null,
    target_organization_id: workspace.organization.id,
    target_role: parsed.data.role,
    target_user_id: targetUserId.userId,
  });

  if (error) {
    return { ok: false, message: getInvitationErrorMessage(error.message) };
  }

  revalidateMemberPaths();
  return { ok: true, message: "Convite enviado." };
}

export async function updateMemberRoleAction(
  userId: string,
  input: unknown,
): Promise<MemberMutationResult> {
  const id = memberIdSchema.safeParse(userId);
  if (!id.success) return { ok: false, message: "Membro invalido." };

  const parsed = input instanceof FormData
    ? memberRoleFormSchema.safeParse({ role: input.get("role") })
    : memberRoleFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "Papel de membro invalido.",
    };
  }

  return manageMember(id.data, parsed.data.role, "active", "Acesso atualizado.");
}

export async function removeMemberAction(userId: string): Promise<MemberMutationResult> {
  const id = memberIdSchema.safeParse(userId);
  if (!id.success) return { ok: false, message: "Membro invalido." };
  return manageMember(id.data, "member", "removed", "Acesso removido.");
}

async function inviteExistingUser(
  userId: string,
  email: string,
  redirectTo: string,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  });

  if (error) {
    return {
      ok: false as const,
      message: "Nao foi possivel enviar o e-mail de convite.",
    };
  }

  return { ok: true as const, userId };
}

async function inviteNewUser(
  values: MemberInviteValues,
  organizationName: string,
  redirectTo: string,
) {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(
      values.email,
      {
        data: {
          invited_by_product: "BEM HUB",
          invited_organization_name: organizationName,
          name: values.name?.trim() || undefined,
        },
        redirectTo,
      },
    );

    if (error || !data.user?.id) {
      return {
        ok: false as const,
        message: "Nao foi possivel enviar o e-mail de convite.",
      };
    }

    return { ok: true as const, userId: data.user.id };
  } catch (error) {
    if (error instanceof SupabaseAdminConfigError) {
      return {
        ok: false as const,
        message: "SUPABASE_SECRET_KEY precisa estar configurada para convidar novos usuarios.",
      };
    }

    return {
      ok: false as const,
      message: "Nao foi possivel criar o convite.",
    };
  }
}

async function manageMember(
  userId: string,
  role: "admin" | "member",
  status: "active" | "removed",
  successMessage: string,
): Promise<MemberMutationResult> {
  const workspace = await getRequiredWorkspace();
  if (!canManageMembers(workspace.membership.role)) {
    return { ok: false, message: "Apenas owner e admins gerenciam membros." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("manage_organization_member", {
    target_organization_id: workspace.organization.id,
    target_role: role,
    target_status: status,
    target_user_id: userId,
  });

  if (error) {
    return { ok: false, message: getInvitationErrorMessage(error.message) };
  }

  revalidateMemberPaths();
  return { ok: true, message: successMessage };
}

function canManageMembers(role: "owner" | "admin" | "member") {
  return role === "owner" || role === "admin";
}

function getInvitationErrorMessage(message: string) {
  if (message.includes("organization_user_limit_reached")) {
    return "Limite de usuarios do plano atingido.";
  }
  if (message.includes("member_already_in_organization")) {
    return "Este usuario ja pertence a esta conta ou tem convite pendente.";
  }
  if (message.includes("member_already_bound_to_team_account")) {
    return "Este usuario ja esta vinculado como equipe em outra conta.";
  }
  if (message.includes("organization_owner_immutable")) {
    return "O owner da conta nao pode ser convidado ou alterado.";
  }
  if (message.includes("direct_member_addition_disabled")) {
    return "Use o fluxo de convite por e-mail.";
  }
  return "Nao foi possivel concluir a operacao.";
}

function revalidateMemberPaths() {
  revalidatePath("/app/settings/team");
  revalidatePath("/app/settings/account");
}
