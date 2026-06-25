export const DEFAULT_OPENAI_MODEL = "gpt-5.5";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export type AiProvider = "openai" | "anthropic" | "gemini" | "open-source";

export type AssistantRuntimeConfig = {
  provider: AiProvider;
  model: string;
  temperature?: number;
};
