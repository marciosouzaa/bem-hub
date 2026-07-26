"use client";

import { Headset, LoaderCircle, RotateCcw, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { SupportConversation } from "@/features/support/queries";
import { SupportMessageDeliveryStatus } from "@/features/support/support-message-delivery-status";
import {
  formatSupportTime,
} from "@/features/support/support-presenters";
import { cn } from "@/lib/utils";

export function SupportMessageThread({
  canRetry,
  messages,
}: {
  canRetry: boolean;
  messages: SupportConversation["messages"];
}) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<{
    message: string;
    messageId: string;
  } | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    container.scrollTo({
      behavior: reduceMotion ? "auto" : "smooth",
      top: container.scrollHeight,
    });
  }, [messages]);

  async function retryMessage(messageId: string) {
    if (retryingId) return;

    setRetryingId(messageId);
    setRetryError(null);
    try {
      const response = await fetch("/api/support/messages", {
        body: JSON.stringify({
          action: "retry",
          clientRequestId: crypto.randomUUID(),
          messageId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const providerMessage = payload
          && typeof payload === "object"
          && "message" in payload
          && typeof payload.message === "string"
          ? payload.message
          : "Não foi possível tentar novamente.";
        throw new Error(providerMessage);
      }

      router.refresh();
    } catch (error) {
      setRetryError({
        message: error instanceof Error
          ? error.message
          : "Não foi possível tentar novamente.",
        messageId,
      });
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-8"
      ref={scrollContainerRef}
    >
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end">
        <div className="mb-7 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          <span className="h-px flex-1 bg-panel-border" />
          Histórico do atendimento
          <span className="h-px flex-1 bg-panel-border" />
        </div>

        {messages.length ? (
          <div className="space-y-5">
            {messages.map((message) => {
              const outbound = message.direction === "outbound";

              return (
                <article
                  className={cn(
                    "flex items-end gap-2.5",
                    outbound && "flex-row-reverse",
                  )}
                  key={message.id}
                >
                  <span
                    className={cn(
                      "mb-1 flex size-7 shrink-0 items-center justify-center rounded-lg border",
                      outbound
                        ? "border-primary/20 bg-sidebar-active text-primary"
                        : "border-panel-border bg-panel-elevated text-muted-strong",
                    )}
                  >
                    {outbound ? (
                      <Headset className="size-3.5" />
                    ) : (
                      <UserRound className="size-3.5" />
                    )}
                  </span>

                  <div
                    className={cn(
                      "max-w-[min(82%,680px)] rounded-[16px] border px-4 py-3 shadow-[var(--shadow-card)]",
                      outbound
                        ? "rounded-br-[6px] border-primary/20 bg-sidebar-active/65"
                        : "rounded-bl-[6px] border-panel-border bg-panel",
                      message.status === "failed" && "border-danger/35",
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {message.content}
                    </p>

                    <div
                      className={cn(
                        "mt-2 flex items-center gap-2 text-[10px] text-muted",
                        outbound && "justify-end",
                      )}
                    >
                      <span>{outbound ? "Equipe" : "Contato"}</span>
                      <span aria-hidden="true">·</span>
                      <time className="font-mono">
                        {formatSupportTime(message.createdAt)}
                      </time>
                      <span aria-hidden="true">·</span>
                      <SupportMessageDeliveryStatus message={message} />
                    </div>

                    {outbound
                      && message.status === "failed"
                      && canRetry ? (
                        <div className="mt-2 border-t border-danger/15 pt-2 text-right">
                          <Button
                            disabled={retryingId !== null}
                            onClick={() => retryMessage(message.id)}
                            size="sm"
                            variant="ghost"
                          >
                            {retryingId === message.id ? (
                              <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
                            ) : (
                              <RotateCcw className="size-3.5" />
                            )}
                            {retryingId === message.id
                              ? "Tentando"
                              : "Tentar novamente"}
                          </Button>
                          {retryError?.messageId === message.id ? (
                            <p
                              aria-live="polite"
                              className="mt-1 max-w-72 text-[11px] leading-4 text-danger"
                            >
                              {retryError.message}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center">
            <UserRound className="mx-auto size-7 text-muted" />
            <p className="mt-3 text-sm text-muted-strong">
              Nenhuma mensagem neste atendimento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
