import type { ChatMessage } from "@/features/chat/types";

export type LocalChatMessage = Pick<ChatMessage, "id" | "role" | "content" | "createdAt" | "knowledge">;
