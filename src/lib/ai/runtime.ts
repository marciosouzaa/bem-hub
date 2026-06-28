import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LanguageModel } from "ai";
import { decryptSecret } from "@/lib/security/encryption";
import type { Database } from "@/types/database";
import type { AiProvider } from "./providers";

type Supabase = SupabaseClient<Database>;

type AssistantRuntimeSource = {
  id: string;
  provider: AiProvider;
  provider_connection_id: string | null;
  model: string;
};

export type AssistantRuntime = {
  provider: AiProvider;
  model: string;
  providerConnectionId: string | null;
  languageModel: LanguageModel;
};

export class AiRuntimeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AiRuntimeError";
    this.status = status;
  }
}

export async function resolveAssistantRuntime(
  supabase: Supabase,
  organizationId: string,
  assistant: AssistantRuntimeSource,
): Promise<AssistantRuntime> {
  const providerConnectionId = assistant.provider_connection_id;
  const connection = providerConnectionId
    ? await getConnection(supabase, organizationId, assistant, providerConnectionId)
    : null;
  const provider = connection?.provider ?? assistant.provider;
  const model = assistant.model;
  const apiKey = connection
    ? decryptSecret(connection.encrypted_api_key)
    : getLegacyEnvironmentKey(provider);

  if (!apiKey) {
    throw new AiRuntimeError(
      `Nenhuma chave de ${getProviderLabel(provider)} configurada para este assistente.`,
      400,
    );
  }

  return {
    provider,
    model,
    providerConnectionId: connection?.id ?? null,
    languageModel: createLanguageModel(provider, model, apiKey),
  };
}

function createLanguageModel(
  provider: AiProvider,
  model: string,
  apiKey: string,
): LanguageModel {
  if (provider === "openai") {
    return createOpenAI({ apiKey }).responses(model);
  }

  if (provider === "anthropic") {
    return createAnthropic({ apiKey })(model);
  }

  if (provider === "gemini") {
    return createGoogle({ apiKey })(model);
  }

  throw new AiRuntimeError(
    "Provider open-source ainda precisa de endpoint compatível configurado.",
    400,
  );
}

async function getConnection(
  supabase: Supabase,
  organizationId: string,
  assistant: AssistantRuntimeSource,
  providerConnectionId: string,
) {
  const { data, error } = await supabase
    .from("ai_provider_connections")
    .select("id,organization_id,provider,status,encrypted_api_key")
    .eq("id", providerConnectionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw new AiRuntimeError(`Falha ao buscar conexão de IA: ${error.message}`, 500);
  }

  if (!data) {
    throw new AiRuntimeError("Conexão de IA não encontrada nesta organização.", 404);
  }

  if (data.status !== "active") {
    throw new AiRuntimeError("Conexão de IA não está ativa.", 400);
  }

  if (data.provider !== assistant.provider) {
    throw new AiRuntimeError(
      "A conexão de IA não pertence ao provider configurado no assistente.",
      400,
    );
  }

  return data;
}

function getLegacyEnvironmentKey(provider: AiProvider) {
  if (provider === "openai") {
    return process.env.OPENAI_API_KEY;
  }

  if (provider === "anthropic") {
    return process.env.ANTHROPIC_API_KEY;
  }

  if (provider === "gemini") {
    return process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  }

  return undefined;
}

function getProviderLabel(provider: AiProvider) {
  if (provider === "anthropic") {
    return "Claude";
  }

  if (provider === "gemini") {
    return "Gemini";
  }

  if (provider === "open-source") {
    return "Open source";
  }

  return "OpenAI";
}
