import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_PROVIDER_DEFINITIONS, type AiProvider } from "@/lib/ai/providers";
import { isMissingRelationError } from "@/lib/supabase/schema-errors";
import type { Database, Json } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type AiProviderConnectionListItem = {
  id: string;
  organizationId: string;
  provider: AiProvider;
  providerLabel: string;
  name: string;
  status: Database["public"]["Enums"]["ai_provider_connection_status"];
  keyHint: string | null;
  defaultModel: string | null;
  availableModels: string[];
  isDefault: boolean;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listAiProviderConnections(
  supabase: Supabase,
  organizationId: string,
): Promise<AiProviderConnectionListItem[]> {
  const { data, error } = await supabase
    .from("ai_provider_connections")
    .select(
      "id,organization_id,provider,name,status,key_hint,default_model,available_models,is_default,validated_at,created_at,updated_at",
    )
    .eq("organization_id", organizationId)
    .order("provider", { ascending: true })
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingRelationError(error, "ai_provider_connections")) {
      return [];
    }

    throw new Error(`Falha ao buscar conexões de IA: ${error.message}`);
  }

  return data.map((connection) => ({
    id: connection.id,
    organizationId: connection.organization_id,
    provider: connection.provider,
    providerLabel: AI_PROVIDER_DEFINITIONS[connection.provider].label,
    name: connection.name,
    status: connection.status,
    keyHint: connection.key_hint,
    defaultModel: connection.default_model,
    availableModels: parseAvailableModels(connection.available_models),
    isDefault: connection.is_default,
    validatedAt: connection.validated_at,
    createdAt: connection.created_at,
    updatedAt: connection.updated_at,
  }));
}

function parseAvailableModels(value: Json): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}
