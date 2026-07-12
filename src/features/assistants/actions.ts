"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getEntitlementErrorMessage,
  getEntitlements,
  requireFeature,
  requireLimitAvailable,
} from "@/features/billing/entitlements";
import { getOrCreateWorkspace } from "@/features/organizations/bootstrap";
import {
  AI_PROVIDER_DEFINITIONS,
  isSupportedProvider,
  type AiProvider,
} from "@/lib/ai/providers";
import { DEFAULT_OPENAI_MODEL } from "@/lib/ai/models";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ASSISTANTS_PATH = "/app/assistants";

const assistantFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe pelo menos 2 caracteres.")
    .max(80, "Use no maximo 80 caracteres."),
  description: z
    .string()
    .trim()
    .max(180, "Use no maximo 180 caracteres.")
    .optional()
    .transform((value) => value || null),
  area: z
    .string()
    .trim()
    .max(60, "Use no maximo 60 caracteres.")
    .optional()
    .transform((value) => value || null),
  instructions: z
    .string()
    .trim()
    .min(10, "Descreva instrucoes com pelo menos 10 caracteres.")
    .max(4000, "Use no maximo 4000 caracteres."),
  provider: z.string().refine(isSupportedProvider, "Provider inválido."),
  providerConnectionId: z
    .string()
    .uuid("Conexão de IA inválida.")
    .nullable(),
  model: z
    .string()
    .trim()
    .min(1, "Informe o modelo.")
    .max(80, "Use no maximo 80 caracteres."),
  temperature: z.coerce
    .number()
    .min(0, "Use um valor entre 0 e 2.")
    .max(2, "Use um valor entre 0 e 2."),
  isDefault: z.boolean(),
});

export type AssistantFormState = {
  ok: boolean;
  message: string | null;
  errors?: Partial<Record<keyof z.infer<typeof assistantFormSchema>, string[]>>;
};

export async function createAssistantAction(
  _previousState: AssistantFormState,
  formData: FormData,
): Promise<AssistantFormState> {
  const parsed = parseAssistantForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise os campos destacados.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, workspace } = await getAdminWorkspace();
  const { count, error: countError } = await supabase
    .from("assistants")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", workspace.organization.id);

  if (countError) {
    return {
      ok: false,
      message: `Falha ao validar assistentes existentes: ${countError.message}`,
    };
  }

  try {
    const entitlements = await getEntitlements(
      supabase,
      workspace.organization.id,
    );
    requireFeature(entitlements, "assistants");
    requireLimitAvailable(entitlements, "assistants", count ?? 0);
  } catch (error) {
    return {
      ok: false,
      message:
        getEntitlementErrorMessage(error) ??
        "Falha ao validar limites do plano.",
    };
  }

  const providerConnectionValidation = await validateProviderConnection(
    supabase,
    workspace.organization.id,
    parsed.data.provider,
    parsed.data.providerConnectionId,
  );

  if (!providerConnectionValidation.ok) {
    return providerConnectionValidation.state;
  }

  const shouldBeDefault = parsed.data.isDefault || count === 0;
  const { data: createdAssistant, error } = await supabase
    .from("assistants")
    .insert({
      organization_id: workspace.organization.id,
      name: parsed.data.name,
      description: parsed.data.description,
      area: parsed.data.area,
      instructions: parsed.data.instructions,
      provider: parsed.data.provider,
      provider_connection_id: parsed.data.providerConnectionId,
      model: parsed.data.model,
      temperature: parsed.data.temperature,
      is_default: false,
      created_by: workspace.user.id,
    })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      message: `Falha ao criar assistente: ${error.message}`,
    };
  }

  if (shouldBeDefault) {
    try {
      await setDefaultAssistant(
        supabase,
        workspace.organization.id,
        createdAssistant.id,
      );
    } catch (defaultError) {
      await supabase
        .from("assistants")
        .delete()
        .eq("id", createdAssistant.id)
        .eq("organization_id", workspace.organization.id);
      return {
        ok: false,
        message:
          defaultError instanceof Error
            ? defaultError.message
            : "Falha ao definir assistente padrao.",
      };
    }
  }

  revalidatePath(ASSISTANTS_PATH);

  return {
    ok: true,
    message: "Assistente criado.",
  };
}

export async function updateAssistantAction(
  assistantId: string,
  _previousState: AssistantFormState,
  formData: FormData,
): Promise<AssistantFormState> {
  const parsed = parseAssistantForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise os campos destacados.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, workspace } = await getAdminWorkspace();
  const entitlements = await getEntitlements(supabase, workspace.organization.id);
  requireFeature(entitlements, "assistants");
  const providerConnectionValidation = await validateProviderConnection(
    supabase,
    workspace.organization.id,
    parsed.data.provider,
    parsed.data.providerConnectionId,
  );

  if (!providerConnectionValidation.ok) {
    return providerConnectionValidation.state;
  }

  const { error } = await supabase
    .from("assistants")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      area: parsed.data.area,
      instructions: parsed.data.instructions,
      provider: parsed.data.provider,
      provider_connection_id: parsed.data.providerConnectionId,
      model: parsed.data.model,
      temperature: parsed.data.temperature,
    })
    .eq("id", assistantId)
    .eq("organization_id", workspace.organization.id);

  if (error) {
    return {
      ok: false,
      message: `Falha ao atualizar assistente: ${error.message}`,
    };
  }

  if (parsed.data.isDefault) {
    await setDefaultAssistant(supabase, workspace.organization.id, assistantId);
  }

  revalidatePath(ASSISTANTS_PATH);

  return {
    ok: true,
    message: "Assistente atualizado.",
  };
}

export async function deleteAssistantAction(
  assistantId: string,
  formData: FormData,
) {
  void formData;
  const { supabase, workspace } = await getAdminWorkspace();
  const entitlements = await getEntitlements(supabase, workspace.organization.id);
  requireFeature(entitlements, "assistants");

  const { data: assistant, error: readError } = await supabase
    .from("assistants")
    .select("id,is_default")
    .eq("id", assistantId)
    .eq("organization_id", workspace.organization.id)
    .maybeSingle();

  if (readError) {
    throw new Error(`Falha ao buscar assistente: ${readError.message}`);
  }

  if (!assistant) {
    throw new Error("Assistente nao encontrado.");
  }

  const { error } = await supabase
    .from("assistants")
    .delete()
    .eq("id", assistantId)
    .eq("organization_id", workspace.organization.id);

  if (error) {
    throw new Error(`Falha ao excluir assistente: ${error.message}`);
  }

  if (assistant.is_default) {
    await promoteFallbackDefault(supabase, workspace.organization.id);
  }

  revalidatePath(ASSISTANTS_PATH);
}

export async function setDefaultAssistantAction(
  assistantId: string,
  formData: FormData,
) {
  void formData;
  const { supabase, workspace } = await getAdminWorkspace();
  const entitlements = await getEntitlements(supabase, workspace.organization.id);
  requireFeature(entitlements, "assistants");

  await setDefaultAssistant(supabase, workspace.organization.id, assistantId);

  revalidatePath(ASSISTANTS_PATH);
}

function parseAssistantForm(formData: FormData) {
  return assistantFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    area: formData.get("area"),
    instructions: formData.get("instructions"),
    provider: formData.get("provider") || "openai",
    providerConnectionId: formData.get("providerConnectionId") || null,
    model:
      formData.get("model") ||
      AI_PROVIDER_DEFINITIONS[
        isSupportedProvider(String(formData.get("provider")))
          ? (formData.get("provider") as AiProvider)
          : "openai"
      ].defaultModel ||
      DEFAULT_OPENAI_MODEL,
    temperature: formData.get("temperature"),
    isDefault: formData.get("isDefault") === "on",
  });
}

async function getAdminWorkspace() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Sessao expirada. Entre novamente.");
  }

  const workspace = await getOrCreateWorkspace(supabase, { user });

  if (!["owner", "admin"].includes(workspace.membership.role)) {
    throw new Error("Apenas owners e admins podem gerenciar assistentes.");
  }

  return { supabase, workspace };
}

async function validateProviderConnection(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  provider: AiProvider,
  providerConnectionId: string | null,
): Promise<
  | { ok: true }
  | {
      ok: false;
      state: AssistantFormState;
    }
> {
  if (!providerConnectionId) {
    return { ok: true };
  }

  const { data, error } = await supabase
    .from("ai_provider_connections")
    .select("id,provider,status")
    .eq("id", providerConnectionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      state: {
        ok: false,
        message: `Falha ao validar conexão de IA: ${error.message}`,
      },
    };
  }

  if (!data) {
    return {
      ok: false,
      state: {
        ok: false,
        message: "Conexão de IA não encontrada nesta organização.",
        errors: { providerConnectionId: ["Selecione uma conexão válida."] },
      },
    };
  }

  if (data.provider !== provider) {
    return {
      ok: false,
      state: {
        ok: false,
        message: "A conexão selecionada pertence a outro provider.",
        errors: {
          providerConnectionId: ["Selecione uma conexão compatível."],
        },
      },
    };
  }

  if (data.status !== "active") {
    return {
      ok: false,
      state: {
        ok: false,
        message: "A conexão selecionada não está ativa.",
        errors: { providerConnectionId: ["Use uma conexão ativa."] },
      },
    };
  }

  return { ok: true };
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

  if (error) {
    throw new Error(`Falha ao definir assistente padrao: ${error.message}`);
  }
}

async function promoteFallbackDefault(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
) {
  const { data: fallback, error: fallbackError } = await supabase
    .from("assistants")
    .select("id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallbackError) {
    throw new Error(`Falha ao escolher novo padrao: ${fallbackError.message}`);
  }

  if (!fallback) {
    return;
  }

  await setDefaultAssistant(supabase, organizationId, fallback.id);
}
