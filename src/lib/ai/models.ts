import type { AiProvider } from "@/lib/ai/providers";

export const DEFAULT_OPENAI_MODEL = "gpt-5.5";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export type AssistantRuntimeConfig = {
  provider: AiProvider;
  model: string;
  temperature?: number;
};
