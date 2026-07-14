"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assistantEditorSchema, type AssistantEditorData } from "@/features/assistants/assistant-editor-schema";
import {
  getEntitlementErrorMessage,
  getEntitlements,
  requireFeature,
  requireLimitAvailable,
} from "@/features/billing/entitlements";
import { getOrCreateWorkspace } from "@/features/organizations/bootstrap";
import type { AiProvider } from "@/lib/ai/providers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ASSISTANTS_PATH = "/app/assistants";

export type AssistantMutationResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: Partial<Record<keyof AssistantEditorData, string[]>> };

export async function createAssistantAction(input: unknown): Promise<AssistantMutationResult> {
  const parsed = assistantEditorSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Revise os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, workspace } = await getAdminWorkspace();
  const { count, error: countError } = await supabase
    .from("assistants")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", workspace.organization.id);

  if (countError) return { ok: false, message: "Não foi possível validar o limite de assistentes." };

  try {
    const entitlements = await getEntitlements(supabase, workspace.organization.id);
    requireFeature(entitlements, "assistants");
    requireLimitAvailable(entitlements, "assistants", count ?? 0);
  } catch (error) {
    return { ok: false, message: getEntitlementErrorMessage(error) ?? "Falha ao validar limites do plano." };
  }

  const connectionValidation = await validateProviderConnection(
    supabase,
    workspace.organization.id,
    parsed.data.provider,
    parsed.data.providerConnectionId,
  );
  if (!connectionValidation.ok) return connectionValidation;

  const shouldBeDefault = parsed.data.isDefault || count === 0;
  const { data: createdAssistant, error } = await supabase
    .from("assistants")
    .insert({
      area: parsed.data.area,
      created_by: workspace.user.id,
      description: parsed.data.description,
      instructions: parsed.data.instructions,
      is_default: false,
      model: parsed.data.model,
      name: parsed.data.name,
      organization_id: workspace.organization.id,
      provider: parsed.data.provider,
      provider_connection_id: parsed.data.providerConnectionId,
      temperature: parsed.data.temperature,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: "Não foi possível criar o assistente." };

  if (shouldBeDefault) {
    try {
      await setDefaultAssistant(supabase, workspace.organization.id, createdAssistant.id);
    } catch (defaultError) {
      await supabase.from("assistants").delete().eq("id", createdAssistant.id).eq("organization_id", workspace.organization.id);
      return {
        ok: false,
        message: defaultError instanceof Error ? defaultError.message : "Falha ao definir o assistente padrão.",
      };
    }
  }

  revalidatePath(ASSISTANTS_PATH);
  return { ok: true, message: "Assistente criado." };
}

export async function updateAssistantAction(assistantId: string, input: unknown): Promise<AssistantMutationResult> {
  const id = z.string().uuid().safeParse(assistantId);
  const parsed = assistantEditorSchema.safeParse(input);
  if (!id.success || !parsed.success) {
    return { ok: false, message: "Revise os campos destacados.", errors: parsed.success ? undefined : parsed.error.flatten().fieldErrors };
  }

  const { supabase, workspace } = await getAdminWorkspace();
  const entitlements = await getEntitlements(supabase, workspace.organization.id);
  requireFeature(entitlements, "assistants");

  const connectionValidation = await validateProviderConnection(
    supabase,
    workspace.organization.id,
    parsed.data.provider,
    parsed.data.providerConnectionId,
  );
  if (!connectionValidation.ok) return connectionValidation;

  const { error } = await supabase
    .from("assistants")
    .update({
      area: parsed.data.area,
      description: parsed.data.description,
      instructions: parsed.data.instructions,
      model: parsed.data.model,
      name: parsed.data.name,
      provider: parsed.data.provider,
      provider_connection_id: parsed.data.providerConnectionId,
      temperature: parsed.data.temperature,
    })
    .eq("id", id.data)
    .eq("organization_id", workspace.organization.id);

  if (error) return { ok: false, message: "Não foi possível atualizar o assistente." };
  if (parsed.data.isDefault) await setDefaultAssistant(supabase, workspace.organization.id, id.data);

  revalidatePath(ASSISTANTS_PATH);
  return { ok: true, message: "Assistente atualizado." };
}

export async function deleteAssistantAction(assistantId: string): Promise<AssistantMutationResult> {
  const id = z.string().uuid().safeParse(assistantId);
  if (!id.success) return { ok: false, message: "Assistente inválido." };

  const { supabase, workspace } = await getAdminWorkspace();
  const entitlements = await getEntitlements(supabase, workspace.organization.id);
  requireFeature(entitlements, "assistants");
  const { error } = await supabase.rpc("delete_assistant", {
    target_assistant_id: id.data,
    target_organization_id: workspace.organization.id,
  });

  if (error) return { ok: false, message: "Não foi possível excluir o assistente." };
  revalidatePath(ASSISTANTS_PATH);
  return { ok: true, message: "Assistente excluído." };
}

export async function setDefaultAssistantAction(assistantId: string): Promise<AssistantMutationResult> {
  const id = z.string().uuid().safeParse(assistantId);
  if (!id.success) return { ok: false, message: "Assistente inválido." };

  const { supabase, workspace } = await getAdminWorkspace();
  const entitlements = await getEntitlements(supabase, workspace.organization.id);
  requireFeature(entitlements, "assistants");
  await setDefaultAssistant(supabase, workspace.organization.id, id.data);
  revalidatePath(ASSISTANTS_PATH);
  return { ok: true, message: "Assistente padrão atualizado." };
}

async function getAdminWorkspace() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Sessão expirada. Entre novamente.");

  const workspace = await getOrCreateWorkspace(supabase, { user });
  if (workspace.membership.role !== "owner" && workspace.membership.role !== "admin") {
    throw new Error("Apenas owners e admins podem gerenciar assistentes.");
  }
  return { supabase, workspace };
}

async function validateProviderConnection(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  provider: AiProvider,
  providerConnectionId: string | null,
): Promise<AssistantMutationResult> {
  if (!providerConnectionId) return { ok: true, message: "Conexão por ambiente." };

  const { data, error } = await supabase
    .from("ai_provider_connections")
    .select("id,provider,status")
    .eq("id", providerConnectionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Conexão de IA não encontrada nesta organização.", errors: { providerConnectionId: ["Selecione uma conexão válida."] } };
  }
  if (data.provider !== provider) {
    return { ok: false, message: "A conexão selecionada pertence a outro provedor.", errors: { providerConnectionId: ["Selecione uma conexão compatível."] } };
  }
  if (data.status !== "active") {
    return { ok: false, message: "A conexão selecionada não está ativa.", errors: { providerConnectionId: ["Use uma conexão ativa."] } };
  }
  return { ok: true, message: "Conexão validada." };
}

async function setDefaultAssistant(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  assistantId: string,
) {
  const { error } = await supabase.rpc("set_default_assistant", {
    target_assistant_id: assistantId,
    target_organization_id: organizationId,
  });
  if (error) throw new Error("Falha ao definir o assistente padrão.");
}
