import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiProvider } from "@/lib/ai/providers";
import { isMissingColumnError } from "@/lib/supabase/schema-errors";
import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type AssistantListItem = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  area: string | null;
  instructions: string;
  provider: AiProvider;
  providerConnectionId: string | null;
  model: string;
  temperature: number;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
};

export async function listAssistants(
  supabase: Supabase,
  organizationId: string,
): Promise<AssistantListItem[]> {
  const { data, error } = await supabase
    .from("assistants")
    .select(
      "id,organization_id,name,description,area,instructions,provider,provider_connection_id,model,temperature,is_default,created_by,created_at",
    )
    .eq("organization_id", organizationId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    if (
      isMissingColumnError(error, [
        "assistants.provider",
        "provider_connection_id",
      ])
    ) {
      return listAssistantsFromLegacySchema(supabase, organizationId);
    }

    throw new Error(`Falha ao buscar assistentes: ${error.message}`);
  }

  return data.map((assistant) => ({
    id: assistant.id,
    organizationId: assistant.organization_id,
    name: assistant.name,
    description: assistant.description,
    area: assistant.area,
    instructions: assistant.instructions,
    provider: assistant.provider,
    providerConnectionId: assistant.provider_connection_id,
    model: assistant.model,
    temperature: Number(assistant.temperature),
    isDefault: assistant.is_default,
    createdBy: assistant.created_by,
    createdAt: assistant.created_at,
  }));
}

async function listAssistantsFromLegacySchema(
  supabase: Supabase,
  organizationId: string,
): Promise<AssistantListItem[]> {
  const { data, error } = await supabase
    .from("assistants")
    .select(
      "id,organization_id,name,description,area,instructions,model,temperature,is_default,created_by,created_at",
    )
    .eq("organization_id", organizationId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Falha ao buscar assistentes: ${error.message}`);
  }

  return data.map((assistant) => ({
    id: assistant.id,
    organizationId: assistant.organization_id,
    name: assistant.name,
    description: assistant.description,
    area: assistant.area,
    instructions: assistant.instructions,
    provider: "openai",
    providerConnectionId: null,
    model: assistant.model,
    temperature: Number(assistant.temperature),
    isDefault: assistant.is_default,
    createdBy: assistant.created_by,
    createdAt: assistant.created_at,
  }));
}
