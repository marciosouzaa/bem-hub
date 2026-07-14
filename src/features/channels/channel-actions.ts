"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { channelFormSchema } from "@/features/channels/channel-schema";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ChannelMutationResult =
  | { ok: true }
  | { ok: false; message: string };

function canManageChannels(role: string) {
  return role === "owner" || role === "admin";
}

export async function createChannelAction(input: unknown): Promise<ChannelMutationResult> {
  const parsed = channelFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revise os dados informados." };

  const workspace = await getRequiredWorkspace();
  if (!canManageChannels(workspace.membership.role)) {
    return { ok: false, message: "Você não tem permissão para cadastrar canais." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("register_channel_connection", {
    connection_auth_method: parsed.data.authMethod,
    connection_kind: parsed.data.kind,
    connection_name: parsed.data.name,
    connection_phone: parsed.data.phone,
    target_organization_id: workspace.organization.id,
  });

  if (error) {
    return {
      ok: false,
      message: error.code === "23505" ? "Este número já está cadastrado." : "Não foi possível cadastrar o canal.",
    };
  }

  revalidatePath("/app/channels");
  return { ok: true };
}

export async function updateChannelAction(connectionId: string, input: unknown): Promise<ChannelMutationResult> {
  const id = z.string().uuid().safeParse(connectionId);
  const parsed = channelFormSchema.safeParse(input);
  if (!id.success || !parsed.success) return { ok: false, message: "Revise os dados informados." };

  const workspace = await getRequiredWorkspace();
  if (!canManageChannels(workspace.membership.role)) {
    return { ok: false, message: "Você não tem permissão para editar canais." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_channel_connection", {
    connection_auth_method: parsed.data.authMethod,
    connection_name: parsed.data.name,
    connection_phone: parsed.data.phone,
    target_connection_id: id.data,
    target_organization_id: workspace.organization.id,
  });

  if (error) return { ok: false, message: "Não foi possível atualizar o canal." };

  revalidatePath("/app/channels");
  return { ok: true };
}

export async function deleteChannelAction(connectionId: string): Promise<ChannelMutationResult> {
  const id = z.string().uuid().safeParse(connectionId);
  if (!id.success) return { ok: false, message: "Canal inválido." };

  const workspace = await getRequiredWorkspace();
  if (!canManageChannels(workspace.membership.role)) {
    return { ok: false, message: "Você não tem permissão para excluir canais." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("delete_channel_connection", {
    target_connection_id: id.data,
    target_organization_id: workspace.organization.id,
  });

  if (error) {
    return {
      ok: false,
      message: "Não foi possível excluir. O canal pode estar vinculado a atendimentos.",
    };
  }

  revalidatePath("/app/channels");
  return { ok: true };
}
