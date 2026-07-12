"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrCreateWorkspace } from "@/features/organizations/bootstrap";
import {
  AI_PROVIDER_DEFINITIONS,
  isSupportedProvider,
  type AiProvider,
} from "@/lib/ai/providers";
import {
  EncryptionConfigError,
  encryptSecret,
} from "@/lib/security/encryption";
import { isMissingRelationError } from "@/lib/supabase/schema-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const AI_PROVIDERS_PATH = "/app/settings/ai-providers";
const ASSISTANTS_PATH = "/app/assistants";
const MISSING_SCHEMA_MESSAGE =
  "A migration de conexoes de IA ainda nao foi aplicada no banco. Execute supabase/migrations/0006_ai_provider_connections.sql antes de salvar conexoes.";

class AiProviderConnectionsSchemaError extends Error {
  constructor() {
    super(MISSING_SCHEMA_MESSAGE);
    this.name = "AiProviderConnectionsSchemaError";
  }
}

const connectionFormSchema = z.object({
  provider: z.string().refine(isSupportedProvider, "Provider inválido."),
  name: z
    .string()
    .trim()
    .min(2, "Informe pelo menos 2 caracteres.")
    .max(80, "Use no máximo 80 caracteres."),
  apiKey: z.string().trim().min(8, "Informe uma chave válida."),
  defaultModel: z
    .string()
    .trim()
    .max(120, "Use no máximo 120 caracteres.")
    .optional()
    .transform((value) => value || null),
  availableModels: z.string().optional().default(""),
  isDefault: z.boolean(),
});

export type AiProviderConnectionFormState = {
  ok: boolean;
  message: string | null;
  errors?: Partial<
    Record<keyof z.infer<typeof connectionFormSchema>, string[]>
  >;
};

export async function createAiProviderConnectionAction(
  _previousState: AiProviderConnectionFormState,
  formData: FormData,
): Promise<AiProviderConnectionFormState> {
  const parsed = connectionFormSchema.safeParse({
    provider: formData.get("provider"),
    name: formData.get("name"),
    apiKey: formData.get("apiKey"),
    defaultModel: formData.get("defaultModel"),
    availableModels: formData.get("availableModels"),
    isDefault: formData.get("isDefault") === "on",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise os campos destacados.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, workspace } = await getAdminWorkspace();
  const provider = parsed.data.provider;
  let shouldBeDefault: boolean;

  try {
    shouldBeDefault = await resolveShouldBeDefault(
      supabase,
      workspace.organization.id,
      provider,
      parsed.data.isDefault,
    );

    if (shouldBeDefault) {
      await unsetDefaultConnections(supabase, workspace.organization.id, provider);
    }
  } catch (error) {
    if (error instanceof AiProviderConnectionsSchemaError) {
      return {
        ok: false,
        message: MISSING_SCHEMA_MESSAGE,
      };
    }

    throw error;
  }

  let encryptedApiKey: string;

  try {
    encryptedApiKey = encryptSecret(parsed.data.apiKey);
  } catch (error) {
    if (error instanceof EncryptionConfigError) {
      return {
        ok: false,
        message:
          "APP_ENCRYPTION_KEY não configurada. Defina a variável antes de salvar chaves de IA.",
      };
    }

    throw error;
  }

  const availableModels = parseModels(
    parsed.data.availableModels,
    provider,
    parsed.data.defaultModel,
  );
  const defaultModel =
    parsed.data.defaultModel ?? AI_PROVIDER_DEFINITIONS[provider].defaultModel;

  const { error } = await supabase.from("ai_provider_connections").insert({
    organization_id: workspace.organization.id,
    provider,
    name: parsed.data.name,
    encrypted_api_key: encryptedApiKey,
    key_hint: getKeyHint(parsed.data.apiKey),
    default_model: defaultModel,
    available_models: availableModels,
    is_default: shouldBeDefault,
    created_by: workspace.user.id,
    validated_at: new Date().toISOString(),
  });

  if (error) {
    if (isMissingRelationError(error, "ai_provider_connections")) {
      return {
        ok: false,
        message: MISSING_SCHEMA_MESSAGE,
      };
    }

    return {
      ok: false,
      message: `Falha ao criar conexão: ${error.message}`,
    };
  }

  revalidatePath(AI_PROVIDERS_PATH);
  revalidatePath(ASSISTANTS_PATH);

  return {
    ok: true,
    message: "Conexão de IA criada.",
  };
}

export async function deleteAiProviderConnectionAction(
  connectionId: string,
  formData: FormData,
) {
  void formData;
  const { supabase, workspace } = await getAdminWorkspace();

  const { error } = await supabase
    .from("ai_provider_connections")
    .delete()
    .eq("id", connectionId)
    .eq("organization_id", workspace.organization.id);

  if (error) {
    throw new Error(`Falha ao excluir conexão: ${error.message}`);
  }

  revalidatePath(AI_PROVIDERS_PATH);
  revalidatePath(ASSISTANTS_PATH);
}

export async function setDefaultAiProviderConnectionAction(
  connectionId: string,
  formData: FormData,
) {
  void formData;
  const { supabase, workspace } = await getAdminWorkspace();

  const { data: connection, error: readError } = await supabase
    .from("ai_provider_connections")
    .select("id,provider")
    .eq("id", connectionId)
    .eq("organization_id", workspace.organization.id)
    .maybeSingle();

  if (readError) {
    throw new Error(`Falha ao buscar conexão: ${readError.message}`);
  }

  if (!connection) {
    throw new Error("Conexão não encontrada.");
  }

  if (!isSupportedProvider(connection.provider)) {
    throw new Error("Provider da conexao e invalido.");
  }

  await unsetDefaultConnections(
    supabase,
    workspace.organization.id,
    connection.provider,
  );

  const { error } = await supabase
    .from("ai_provider_connections")
    .update({
      is_default: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id)
    .eq("organization_id", workspace.organization.id);

  if (error) {
    throw new Error(`Falha ao definir conexão padrão: ${error.message}`);
  }

  revalidatePath(AI_PROVIDERS_PATH);
  revalidatePath(ASSISTANTS_PATH);
}

async function getAdminWorkspace() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Sessão expirada. Entre novamente.");
  }

  const workspace = await getOrCreateWorkspace(supabase, { user });

  if (!["owner", "admin"].includes(workspace.membership.role)) {
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
  if (requestedDefault) {
    return true;
  }

  const { count, error } = await supabase
    .from("ai_provider_connections")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("provider", provider);

  if (error) {
    if (isMissingRelationError(error, "ai_provider_connections")) {
      throw new AiProviderConnectionsSchemaError();
    }

    throw new Error(`Falha ao validar conexão padrão: ${error.message}`);
  }

  return count === 0;
}

async function unsetDefaultConnections(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  provider: AiProvider,
) {
  const { error } = await supabase
    .from("ai_provider_connections")
    .update({
      is_default: false,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("provider", provider);

  if (error) {
    if (isMissingRelationError(error, "ai_provider_connections")) {
      throw new AiProviderConnectionsSchemaError();
    }

    throw new Error(`Falha ao limpar padrão atual: ${error.message}`);
  }
}

function parseModels(
  rawValue: string,
  provider: AiProvider,
  defaultModel: string | null,
) {
  const models = rawValue
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (defaultModel) {
    models.unshift(defaultModel);
  }

  if (!models.length) {
    models.push(...AI_PROVIDER_DEFINITIONS[provider].suggestedModels);
  }

  return Array.from(new Set(models));
}

function getKeyHint(apiKey: string) {
  const visible = apiKey.slice(-4);
  return visible ? `•••• ${visible}` : null;
}
