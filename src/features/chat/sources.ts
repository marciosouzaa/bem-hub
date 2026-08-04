import { z } from "zod";
import type { Json } from "@/types/database";

export const CHAT_KNOWLEDGE_HEADER = "x-bem-knowledge-context";

const chatKnowledgeSourceSchema = z.object({
  documentId: z.string().uuid(),
  documentName: z.string().trim().min(1).max(255),
  relevance: z.number().min(-1).max(1),
  chunkCount: z.number().int().min(1).max(8),
  // Messages persisted before chunk references remain readable.
  chunkIndexes: z.array(z.number().int().nonnegative()).max(8).default([]),
});

export const chatKnowledgeContextSchema = z.object({
  status: z.enum(["grounded", "no_match", "no_documents", "disabled"]),
  sources: z.array(chatKnowledgeSourceSchema).max(6),
  embeddingModel: z.string().trim().min(1).max(120).nullable(),
});

export type ChatKnowledgeSource = z.infer<typeof chatKnowledgeSourceSchema>;
export type ChatKnowledgeContext = z.infer<typeof chatKnowledgeContextSchema>;

export function parseMessageKnowledgeContext(
  metadata: Json,
): ChatKnowledgeContext | null {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
    return null;
  }

  const result = chatKnowledgeContextSchema.safeParse(metadata.knowledge);
  return result.success ? result.data : null;
}

export function encodeKnowledgeContextHeader(context: ChatKnowledgeContext) {
  return encodeURIComponent(JSON.stringify(context));
}

export function decodeKnowledgeContextHeader(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    const result = chatKnowledgeContextSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
