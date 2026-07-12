import type { LanguageModel } from "ai";

export type AiProvider = "openai" | "anthropic" | "gemini" | "open-source";

export type AiProviderConnectionStatus =
  | "active"
  | "needs_attention"
  | "disabled";

export type AiProviderDefinition = {
  provider: AiProvider;
  label: string;
  description: string;
  defaultModel: string;
  suggestedModels: string[];
};

export type ResolvedLanguageModel = {
  provider: AiProvider;
  model: string;
  languageModel: LanguageModel;
};

export const AI_PROVIDER_DEFINITIONS: Record<AiProvider, AiProviderDefinition> =
  {
    openai: {
      provider: "openai",
      label: "OpenAI",
      description: "Modelos GPT para chat, análise e automações gerais.",
      defaultModel: "gpt-5.5",
      suggestedModels: ["gpt-5.5", "gpt-4.1", "gpt-4.1-mini"],
    },
    anthropic: {
      provider: "anthropic",
      label: "Claude",
      description: "Modelos Claude para escrita, análise e raciocínio longo.",
      defaultModel: "claude-sonnet-4-5",
      suggestedModels: ["claude-sonnet-4-5", "claude-opus-4-1"],
    },
    gemini: {
      provider: "gemini",
      label: "Gemini",
      description: "Modelos Gemini para contexto longo e fluxos multimodais.",
      defaultModel: "gemini-2.5-pro",
      suggestedModels: ["gemini-2.5-pro", "gemini-2.5-flash"],
    },
    "open-source": {
      provider: "open-source",
      label: "Open source",
      description: "Modelos compatíveis com endpoint próprio no futuro.",
      defaultModel: "custom-model",
      suggestedModels: ["custom-model"],
    },
  };

export const AI_PROVIDERS = Object.values(AI_PROVIDER_DEFINITIONS);

export function getProviderDefinition(provider: AiProvider) {
  return AI_PROVIDER_DEFINITIONS[provider];
}

export function isSupportedProvider(value: string): value is AiProvider {
  return value in AI_PROVIDER_DEFINITIONS;
}

export function getModelOptions(provider: AiProvider) {
  return getProviderDefinition(provider).suggestedModels;
}
