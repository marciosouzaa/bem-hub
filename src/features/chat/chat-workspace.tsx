"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssistantListItem } from "@/features/assistants/queries";
import { ChatConversationRail } from "@/features/chat/chat-conversation-rail";
import { ChatMessageList } from "@/features/chat/chat-message-list";
import { ChatPromptComposer } from "@/features/chat/chat-prompt-composer";
import type { LocalChatMessage } from "@/features/chat/chat-workspace-types";
import { CHAT_KNOWLEDGE_HEADER, decodeKnowledgeContextHeader } from "@/features/chat/sources";
import type { ChatMessage, ConversationListItem } from "@/features/chat/types";
import { FeedbackMessage } from "@/components/ui/feedback-message";

type ChatWorkspaceProps = {
  assistants: AssistantListItem[];
  conversations: ConversationListItem[];
  currentAssistantId: string | null;
  currentConversationId: string | null;
  initialMessages: ChatMessage[];
  monthlyLimit: number;
  monthlyUsage: number;
};

export function ChatWorkspace({ assistants, conversations, currentAssistantId, currentConversationId, initialMessages, monthlyLimit, monthlyUsage }: ChatWorkspaceProps) {
  const router = useRouter();
  const defaultAssistant = assistants.find((assistant) => assistant.isDefault);
  const [assistantId, setAssistantId] = useState(currentAssistantId ?? defaultAssistant?.id ?? assistants[0]?.id ?? "");
  const [conversationId, setConversationId] = useState(currentConversationId);
  const [messages, setMessages] = useState<LocalChatMessage[]>(initialMessages.map((message) => ({ id: message.id, role: message.role, content: message.content, createdAt: message.createdAt, knowledge: message.knowledge })));
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeAssistant = assistants.find((assistant) => assistant.id === assistantId);
  const hasConversation = Boolean(conversationId);
  const remainingMessages = Math.max(monthlyLimit - monthlyUsage, 0);
  const usagePercent = monthlyLimit > 0 ? Math.min((monthlyUsage / monthlyLimit) * 100, 100) : 100;
  const canSend = Boolean(input.trim()) && Boolean(assistantId) && !isStreaming && remainingMessages > 0;

  useEffect(() => { scrollRef.current?.scrollIntoView({ block: "end" }); }, [messages, isStreaming]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isStreaming || !assistantId || remainingMessages <= 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const userMessage: LocalChatMessage = { id: crypto.randomUUID(), role: "user", content: message, createdAt: new Date().toISOString(), knowledge: null };
    const assistantMessage: LocalChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "", createdAt: new Date().toISOString(), knowledge: null };
    setInput(""); setError(null); setIsStreaming(true); setMessages((current) => [...current, userMessage, assistantMessage]);
    try {
      const response = await fetch("/api/chat", { body: JSON.stringify({ assistantId, requestId: userMessage.id, ...(conversationId ? { conversationId } : {}), message }), headers: { "Content-Type": "application/json" }, method: "POST", signal: controller.signal });
      if (!response.ok || !response.body) throw new Error(await readError(response));
      const nextConversationId = response.headers.get("x-conversation-id");
      const shouldNavigateToConversation = nextConversationId && nextConversationId !== conversationId;
      const knowledge = decodeKnowledgeContextHeader(response.headers.get(CHAT_KNOWLEDGE_HEADER));
      if (knowledge) setMessages((current) => current.map((item) => item.id === assistantMessage.id ? { ...item, knowledge } : item));
      if (shouldNavigateToConversation) setConversationId(nextConversationId);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((current) => current.map((item) => item.id === assistantMessage.id ? { ...item, content: item.content + chunk } : item));
      }
      if (shouldNavigateToConversation) router.replace(`/app/chat?conversationId=${nextConversationId}`, { scroll: false }); else router.refresh();
    } catch (caught) {
      if (controller.signal.aborted) { setError("Resposta interrompida."); return; }
      setError(caught instanceof Error ? caught.message : "Falha ao enviar mensagem.");
      setMessages((current) => current.filter((item) => item.id !== assistantMessage.id));
    } finally { abortRef.current = null; setIsStreaming(false); }
  }

  return <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 md:px-8 xl:grid-cols-[280px_1fr]">
    <ChatConversationRail conversationId={conversationId} conversations={conversations} monthlyLimit={monthlyLimit} monthlyUsage={monthlyUsage} remainingMessages={remainingMessages} usagePercent={usagePercent} />
    <section className="min-w-0"><Card className="flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden"><CardHeader className="border-b border-panel-border"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><Badge>Chat corporativo</Badge><CardTitle className="mt-3 text-2xl">Conversas com assistentes</CardTitle><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-strong">Use os assistentes oficiais do workspace. O histórico fica salvo por organização.</p></div><label className="grid gap-2 text-sm text-muted-strong">Assistente<select className="h-10 min-w-64 rounded-md border border-panel-border bg-panel-elevated px-3 text-sm text-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70" disabled={!assistants.length || isStreaming || hasConversation} onChange={(event) => setAssistantId(event.target.value)} value={assistantId}>{assistants.map((assistant) => <option key={assistant.id} value={assistant.id}>{assistant.name}</option>)}</select></label></div></CardHeader><CardContent className="flex min-h-0 flex-1 flex-col p-0"><ChatMessageList assistant={activeAssistant} isStreaming={isStreaming} messages={messages} scrollRef={scrollRef} />{error ? <FeedbackMessage className="rounded-none border-x-0 border-b-0 px-5 py-3" variant="error">{error}</FeedbackMessage> : null}{remainingMessages <= 0 ? <FeedbackMessage className="rounded-none border-x-0 border-b-0 px-5 py-3" variant="warning">Limite mensal do plano atingido. Atualize o plano para continuar conversando.</FeedbackMessage> : null}<ChatPromptComposer assistantCount={assistants.length} canSend={canSend} disabled={!assistants.length || isStreaming} input={input} isStreaming={isStreaming} onChange={setInput} onStop={() => abortRef.current?.abort()} onSubmit={handleSubmit} remainingMessages={remainingMessages} /></CardContent></Card></section>
  </div>;
}

async function readError(response: Response) {
  try { const body = (await response.json()) as { error?: string }; return body.error || "Falha ao processar a conversa."; } catch { return "Falha ao processar a conversa."; }
}
