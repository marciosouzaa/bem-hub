import { z } from "zod";
import type { ChatKnowledgeContext } from "./sources";

export const chatRoleSchema = z.enum(["user", "assistant", "system"]);

export type ChatRole = z.infer<typeof chatRoleSchema>;

export type ConversationListItem = {
  id: string;
  organizationId: string;
  assistantId: string | null;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  organizationId: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  model: string | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  knowledge: ChatKnowledgeContext | null;
  createdAt: string;
};
