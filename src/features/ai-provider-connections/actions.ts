"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { aiProviderConnectionEditorSchema, type AiProviderConnectionEditorData } from "@/features/ai-provider-connections/connection-editor-schema";
import { getOrCreateWorkspace } from "@/features/organizations/bootstrap";
import { AI_PROVIDER_DEFINITIONS, isSupportedProvider, type AiProvider } from "@/lib/ai/providers";
import { EncryptionConfigError, encryptSecret } from "@/lib/security/encryption";
import { isMissingRelationError } from "@/lib/supabase/schema-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const AI_PROVIDERS_PATH = "/app/settings/ai-providers";
const ASSISTANTS_PATH = "/app/assistants";
const MISSING_SCHEMA_MESSAGE = "A estrutura de conexões de IA ainda não foi aplicada no banco.";

export type AiProviderConnectionMutationResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: Partial<Record<keyof AiProviderConnectionEditorData, string[]>> };

export async function createAiProviderConnectionAction(input: unknown): Promise<AiProviderConnectionMutationResult> {
  const parsed = aiProviderConnectionEditorSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Revise os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, workspace } = await getAdminWorkspace();
  const provider = parsed.data.provider;
  let shouldBeDefault: boolean;

  try {
    shouldBeDefault = await resolveShouldBeDefault(supabase, workspace.organization.id, provider, parsed.data.isDefault);
    if (shouldBeDefault) await unsetDefaultConnections(supabase, workspace.organization.id, provider);
  } catch (error) {
    if (isMissingRelationErrorValue(error)) return { ok: false, message: MISSING_SCHEMA_MESSAGE };
    throw error;
  }

  let encryptedApiKey: string;
  try {
    encryptedApiKey = encryptSecret(parsed.data.apiKey);
  } catch (error) {
    if (error instanceof EncryptionConfigError) {
      return { ok: false, message: "APP_ENCRYPTION_KEY não configurada. Defina a variável antes de salvar chaves de IA." };
    }
    throw error;
  }

  const defaultModel = parsed.data.defaultModel ?? AI_PROVIDER_DEFINITIONS[provider].defaultModel;
  const { error } = await supabase.from("ai_provider_connections").insert({
    available_models: parseModels(parsed.data.availableModels, provider, parsed.data.defaultModel),
    created_by: workspace.user.id,
    default_model: defaultModel,
    encrypted_api_key: encryptedApiKey,
    is_default: shouldBeDefault,
    key_hint: getKeyHint(parsed.data.apiKey),
    name: parsed.data.name,
    organization_id: workspace.organization.id,
    provider,
    validated_at: new Date().toISOString(),
  });

  if (error) {
    if (isMissingRelationError(error, "ai_provider_connections")) return { ok: false, message: MISSING_SCHEMA_MESSAGE };
    return { ok: false, message: "Não foi possível criar a conexão." };
  }

  revalidateConnectionPaths();
  return { ok: true, message: "Conexão de IA criada." };
}

export async function deleteAiProviderConnectionAction(connectionId: string): Promise<AiProviderConnectionMutationResult> {
  const id = z.string().uuid().safeParse(connectionId);
  if (!id.success) return { ok: false, message: "Conexão inválida." };
  const { supabase, workspace } = await getAdminWorkspace();
  const { error } = await supabase.from("ai_provider_connections").delete().eq("id", id.data).eq("organization_id", workspace.organization.id);
  if (error) return { ok: false, message: "Não foi possível excluir a conexão. Ela pode estar em uso." };
  revalidateConnectionPaths();
  return { ok: true, message: "Conexão excluída." };
}

export async function setDefaultAiProviderConnectionAction(connectionId: string): Promise<AiProviderConnectionMutationResult> {
  const id = z.string().uuid().safeParse(connectionId);
  if (!id.success) return { ok: false, message: "Conexão inválida." };
  const { supabase, workspace } = await getAdminWorkspace();
  const { data: connection, error: readError } = await supabase
    .from("ai_provider_connections")
    .select("id,provider")
    .eq("id", id.data)
    .eq("organization_id", workspace.organization.id)
    .maybeSingle();

  if (readError || !connection || !isSupportedProvider(connection.provider)) {
    return { ok: false, message: "Conexão não encontrada nesta organização." };
  }

  await unsetDefaultConnections(supabase, workspace.organization.id, connection.provider);
  const { error } = await supabase
    .from("ai_provider_connections")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", connection.id)
    .eq("organization_id", workspace.organization.id);
  if (error) return { ok: false, message: "Não foi possível definir a conexão padrão." };

  revalidateConnectionPaths();
  return { ok: true, message: "Conexão padrão atualizada." };
}

async function getAdminWorkspace() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Sessão expirada. Entre novamente.");
  const workspace = await getOrCreateWorkspace(supabase, { user });
  if (workspace.membership.role !== "owner" && workspace.membership.role !== "admin") {
    throw new Error("Apenas owners e admins podem gerenciar conexões de IA.");
  }
  return { supabase, workspace };
}

async function resolveShouldBeDefault(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  provider: AiProvider,
  requestedDefault: boolean,
) {
  if (requestedDefault) return true;
  const { count, error } = await supabase.from("ai_provider_connections").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("provider", provider);
  if (error) throw error;
  return count === 0;
}

async function unsetDefaultConnections(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  provider: AiProvider,
) {
  const { error } = await supabase.from("ai_provider_connections").update({ is_default: false, updated_at: new Date().toISOString() }).eq("organization_id", organizationId).eq("provider", provider);
  if (error) throw error;
}

function parseModels(rawValue: string, provider: AiProvider, defaultModel: string | null) {
  const models = rawValue.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  if (defaultModel) models.unshift(defaultModel);
  if (!models.length) models.push(...AI_PROVIDER_DEFINITIONS[provider].suggestedModels);
  return Array.from(new Set(models));
}

function getKeyHint(apiKey: string) {
  const visible = apiKey.slice(-4);
  return visible ? `•••• ${visible}` : null;
}

function revalidateConnectionPaths() {
  revalidatePath(AI_PROVIDERS_PATH);
  revalidatePath(ASSISTANTS_PATH);
}

function isMissingRelationErrorValue(error: unknown) {
  return typeof error === "object" && error !== null && isMissingRelationError(error as { code?: string; message: string }, "ai_provider_connections");
}
