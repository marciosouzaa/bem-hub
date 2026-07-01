import { embed, embedMany, type EmbeddingModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_EMBEDDING_MODEL } from "@/lib/ai/models";
import { decryptSecret } from "@/lib/security/encryption";
import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type EmbeddingRuntime = {
  model: string;
  providerConnectionId: string | null;
  embeddingModel: EmbeddingModel;
};

export class EmbeddingRuntimeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "EmbeddingRuntimeError";
    this.status = status;
  }
}

export async function resolveOpenAIEmbeddingRuntime(
  supabase: Supabase,
  organizationId: string,
): Promise<EmbeddingRuntime> {
  const connection = await getOpenAIConnection(supabase, organizationId);
  const apiKey = connection
    ? decryptSecret(connection.encrypted_api_key)
    : process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new EmbeddingRuntimeError(
      "Configure uma conexao OpenAI ativa ou OPENAI_API_KEY para processar embeddings.",
      400,
    );
  }

  const provider = createOpenAI({ apiKey });

  return {
    model: DEFAULT_EMBEDDING_MODEL,
    providerConnectionId: connection?.id ?? null,
    embeddingModel: provider.embedding(DEFAULT_EMBEDDING_MODEL),
  };
}

export async function embedText(
  runtime: EmbeddingRuntime,
  value: string,
): Promise<number[]> {
  const result = await embed({
    model: runtime.embeddingModel,
    value,
  });

  return result.embedding;
}

export async function embedTexts(
  runtime: EmbeddingRuntime,
  values: string[],
): Promise<number[][]> {
  const result = await embedMany({
    model: runtime.embeddingModel,
    values,
  });

  return result.embeddings;
}

async function getOpenAIConnection(supabase: Supabase, organizationId: string) {
  const { data, error } = await supabase
    .from("ai_provider_connections")
    .select("id,provider,status,encrypted_api_key,is_default,created_at")
    .eq("organization_id", organizationId)
    .eq("provider", "openai")
    .eq("status", "active")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new EmbeddingRuntimeError(
      `Falha ao buscar conexao OpenAI: ${error.message}`,
      500,
    );
  }

  return data;
}
