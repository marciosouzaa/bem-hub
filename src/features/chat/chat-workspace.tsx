"use client";

import {
  Bot,
  Loader2,
  MessageSquareText,
  Plus,
  SendHorizontal,
  Sparkles,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AssistantListItem } from "@/features/assistants/queries";
import type { ChatMessage, ConversationListItem } from "./types";

type LocalMessage = Pick<ChatMessage, "id" | "role" | "content" | "createdAt">;

type ChatWorkspaceProps = {
  assistants: AssistantListItem[];
  conversations: ConversationListItem[];
  currentAssistantId: string | null;
  currentConversationId: string | null;
  initialMessages: ChatMessage[];
  monthlyLimit: number;
  monthlyUsage: number;
};

export function ChatWorkspace({
  assistants,
  conversations,
  currentAssistantId,
  currentConversationId,
  initialMessages,
  monthlyLimit,
  monthlyUsage,
}: ChatWorkspaceProps) {
  const router = useRouter();
  const defaultAssistant = assistants.find((assistant) => assistant.isDefault);
  const [assistantId, setAssistantId] = useState(
    currentAssistantId ?? defaultAssistant?.id ?? assistants[0]?.id ?? "",
  );
  const [conversationId, setConversationId] = useState(currentConversationId);
  const [messages, setMessages] = useState<LocalMessage[]>(
    initialMessages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
  );
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeAssistant = assistants.find(
    (assistant) => assistant.id === assistantId,
  );
  const hasConversation = Boolean(conversationId);
  const remainingMessages = Math.max(monthlyLimit - monthlyUsage, 0);
  const usagePercent =
    monthlyLimit > 0 ? Math.min((monthlyUsage / monthlyLimit) * 100, 100) : 100;
  const canSend =
    Boolean(input.trim()) &&
    Boolean(assistantId) &&
    !isStreaming &&
    remainingMessages > 0;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isStreaming]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();
    if (!message || isStreaming || !assistantId || remainingMessages <= 0) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const userMessage: LocalMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    const assistantMessage: LocalMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    setInput("");
    setError(null);
    setIsStreaming(true);
    setMessages((current) => [...current, userMessage, assistantMessage]);

    try {
      const response = await fetch("/api/chat", {
        body: JSON.stringify({
          assistantId,
          ...(conversationId ? { conversationId } : {}),
          message,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(await readError(response));
      }

      const nextConversationId = response.headers.get("x-conversation-id");
      if (nextConversationId && nextConversationId !== conversationId) {
        setConversationId(nextConversationId);
        router.replace(`/app/chat?conversationId=${nextConversationId}`, {
          scroll: false,
        });
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantMessage.id
              ? { ...item, content: item.content + chunk }
              : item,
          ),
        );
      }

      router.refresh();
    } catch (caught) {
      if (controller.signal.aborted) {
        setError("Resposta interrompida.");
        return;
      }

      const message =
        caught instanceof Error
          ? caught.message
          : "Falha ao enviar mensagem.";
      setError(message);
      setMessages((current) =>
        current.filter((item) => item.id !== assistantMessage.id),
      );
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 md:px-8 xl:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <Button asChild className="w-full" variant="secondary">
          <Link href="/app/chat">
            <Plus className="size-4" />
            Nova conversa
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.12em]">
              <MessageSquareText className="size-4 text-primary" />
              Histórico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {conversations.length ? (
              conversations.map((conversation) => (
                <Link
                  className={cn(
                    "block rounded-md border border-panel-border bg-panel-elevated px-3 py-3 text-sm transition hover:border-primary hover:text-primary",
                    conversation.id === conversationId &&
                      "border-primary bg-sidebar-active text-primary",
                  )}
                  href={`/app/chat?conversationId=${conversation.id}`}
                  key={conversation.id}
                >
                  <span className="line-clamp-2">
                    {conversation.title || "Conversa sem título"}
                  </span>
                  <span className="mt-2 block text-xs text-muted">
                    {new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      month: "2-digit",
                    }).format(new Date(conversation.updatedAt))}
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted-strong">
                Nenhuma conversa registrada ainda.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted">
              Uso mensal
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="font-mono text-2xl text-primary">
                {monthlyUsage}
              </p>
              <p className="text-sm text-muted-strong">/ {monthlyLimit}</p>
            </div>
            <div className="mt-3 h-1 rounded-full bg-panel-subtle">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${usagePercent}%`,
                }}
              />
            </div>
            <p className="mt-3 text-xs text-muted">
              {remainingMessages} respostas restantes no plano atual.
            </p>
          </CardContent>
        </Card>
      </aside>

      <section className="min-w-0">
        <Card className="flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden">
          <CardHeader className="border-b border-panel-border">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Badge>Chat corporativo</Badge>
                <CardTitle className="mt-3 text-2xl">
                  Conversas com assistentes
                </CardTitle>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-strong">
                  Use os assistentes oficiais do workspace. O histórico fica
                  salvo por organização.
                </p>
              </div>
              <label className="grid gap-2 text-sm text-muted-strong">
                Assistente
                <select
                  className="h-10 min-w-64 rounded-md border border-panel-border bg-panel-elevated px-3 text-sm text-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={!assistants.length || isStreaming || hasConversation}
                  onChange={(event) => setAssistantId(event.target.value)}
                  value={assistantId}
                >
                  {assistants.map((assistant) => (
                    <option key={assistant.id} value={assistant.id}>
                      {assistant.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-6">
              {messages.length ? (
                messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              ) : (
                <EmptyChat assistant={activeAssistant} />
              )}
              {isStreaming ? (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="size-4 animate-spin" />
                  Assistente respondendo
                </div>
              ) : null}
              <div ref={scrollRef} />
            </div>

            {error ? (
              <div className="border-t border-panel-border bg-panel-subtle px-5 py-3 text-sm text-danger">
                {error}
              </div>
            ) : null}

            {remainingMessages <= 0 ? (
              <div className="border-t border-panel-border bg-panel-subtle px-5 py-3 text-sm text-warning">
                Limite mensal do plano atingido. Atualize o plano para continuar
                conversando.
              </div>
            ) : null}

            <form
              className="border-t border-panel-border bg-panel-subtle p-4"
              onSubmit={handleSubmit}
            >
              <div className="flex gap-3">
                <textarea
                  className="max-h-40 min-h-12 flex-1 resize-none rounded-md border border-panel-border bg-panel px-4 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={!assistants.length || isStreaming}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder={getPlaceholder(assistants.length, remainingMessages)}
                  value={input}
                />
                {isStreaming ? (
                  <Button
                    aria-label="Interromper resposta"
                    onClick={stopStreaming}
                    size="icon"
                    type="button"
                    variant="secondary"
                  >
                    <Square className="size-4" />
                  </Button>
                ) : (
                  <Button
                    aria-label="Enviar mensagem"
                    disabled={!canSend}
                    size="icon"
                    type="submit"
                  >
                    <SendHorizontal className="size-4" />
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MessageBubble({ message }: { message: LocalMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "justify-end")}>
      {!isUser ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-active text-primary">
          <Bot className="size-4" />
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[82%] rounded-lg border px-4 py-3 text-sm leading-6",
          isUser
            ? "border-primary/50 bg-sidebar-active text-foreground"
            : "border-panel-border bg-panel-elevated text-muted-strong",
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content || "Preparando resposta..."}
        </p>
      </div>
    </div>
  );
}

function EmptyChat({
  assistant,
}: {
  assistant: AssistantListItem | undefined;
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
      <span className="flex size-12 items-center justify-center rounded-md bg-sidebar-active text-primary">
        <Sparkles className="size-6" />
      </span>
      <h2 className="mt-5 text-xl font-semibold">Inicie uma conversa</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-strong">
        {assistant
          ? `O assistente ${assistant.name} está pronto para responder com as instruções oficiais do workspace.`
          : "Nenhum assistente disponível. Crie um assistente oficial para liberar o chat."}
      </p>
      {!assistant ? (
        <Button asChild className="mt-5" variant="secondary">
          <Link href="/app/assistants">Criar assistente</Link>
        </Button>
      ) : null}
    </div>
  );
}

function getPlaceholder(assistantCount: number, remainingMessages: number) {
  if (!assistantCount) {
    return "Crie um assistente antes de iniciar o chat.";
  }

  if (remainingMessages <= 0) {
    return "Limite mensal atingido.";
  }

  return "Digite uma pergunta para o assistente...";
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || "Falha ao processar a conversa.";
  } catch {
    return "Falha ao processar a conversa.";
  }
}
