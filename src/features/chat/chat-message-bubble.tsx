"use client";

import { Bot } from "lucide-react";

import { ChatKnowledgeCitations } from "@/features/chat/chat-knowledge-citations";
import type { LocalChatMessage } from "@/features/chat/chat-workspace-types";
import { cn } from "@/lib/utils";

export function ChatMessageBubble({ message }: { message: LocalChatMessage }) {
  const isUser = message.role === "user";
  return <div className={cn("flex gap-3", isUser && "justify-end")}>{!isUser ? <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-active text-primary"><Bot className="size-4" /></span> : null}<div className={cn("max-w-[82%] rounded-lg border px-4 py-3 text-sm leading-6", isUser ? "border-primary/50 bg-sidebar-active text-foreground" : "border-panel-border bg-panel-elevated text-muted-strong")}><p className="whitespace-pre-wrap break-words">{message.content || "Preparando resposta..."}</p>{!isUser && message.content ? <ChatKnowledgeCitations knowledge={message.knowledge} /> : null}</div></div>;
}
