"use client";

import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import type { AssistantListItem } from "@/features/assistants/queries";
import { ChatMessageBubble } from "@/features/chat/chat-message-bubble";
import type { LocalChatMessage } from "@/features/chat/chat-workspace-types";

export function ChatMessageList({ assistant, isStreaming, messages, scrollRef }: { assistant: AssistantListItem | undefined; isStreaming: boolean; messages: LocalChatMessage[]; scrollRef: RefObject<HTMLDivElement | null> }) {
  return <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-6">{messages.length ? messages.map((message) => <ChatMessageBubble key={message.id} message={message} />) : <EmptyChat assistant={assistant} />}{isStreaming ? <div className="flex items-center gap-2 text-sm text-primary"><Loader2 className="size-4 animate-spin" />Assistente respondendo</div> : null}<div ref={scrollRef} /></div>;
}

function EmptyChat({ assistant }: { assistant: AssistantListItem | undefined }) {
  return <div className="flex min-h-[420px] flex-col items-center justify-center text-center"><span className="flex size-12 items-center justify-center rounded-md bg-sidebar-active text-primary"><Sparkles className="size-6" /></span><h2 className="mt-5 text-xl font-semibold">Inicie uma conversa</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-strong">{assistant ? `O assistente ${assistant.name} está pronto para responder com as instruções oficiais do workspace.` : "Nenhum assistente disponível. Crie um assistente oficial para liberar o chat."}</p>{!assistant ? <Button asChild className="mt-5" variant="secondary"><Link href="/app/assistants">Criar assistente</Link></Button> : null}</div>;
}
