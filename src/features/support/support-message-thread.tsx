import { Bot, Check, PencilLine, ShieldAlert, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewDraftAction, updateDraftAction } from "@/features/support/actions";
import type { SupportConversation } from "@/features/support/queries";
import {
  formatSupportTime,
  supportMessageStatusLabels,
} from "@/features/support/support-presenters";
import { cn } from "@/lib/utils";

export function SupportMessageThread({
  conversationId,
  messages,
}: {
  conversationId: string;
  messages: SupportConversation["messages"];
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-8">
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
                      <Bot className="size-3.5" />
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
                      message.status === "draft" &&
                        "w-full max-w-[min(88%,720px)] border-ai-purple/25 bg-ai-purple/5",
                    )}
                  >
                    {message.status === "draft" ? (
                      <DraftReviewCard
                        conversationId={conversationId}
                        content={message.content}
                        messageId={message.id}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {message.content}
                      </p>
                    )}

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
                      <span>{supportMessageStatusLabels[message.status]}</span>
                    </div>
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

function DraftReviewCard({
  content,
  conversationId,
  messageId,
}: {
  content: string;
  conversationId: string;
  messageId: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-ai-purple">
        <PencilLine className="size-3.5" />
        Rascunho em revisão
      </div>
      <form
        action={updateDraftAction.bind(null, conversationId, messageId)}
        className="space-y-3"
      >
        <Textarea
          aria-label="Conteúdo do rascunho"
          className="min-h-24 border-ai-purple/20 bg-background/45"
          defaultValue={content}
          maxLength={10_000}
          name="content"
          required
        />
        <Button size="sm" type="submit" variant="outline">
          Salvar edição
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-ai-purple/15 pt-3">
        <form action={reviewDraftAction.bind(null, conversationId, messageId, "approved")}>
          <Button size="sm" type="submit">
            <Check className="size-3.5" />
            Aprovar
          </Button>
        </form>
        <form action={reviewDraftAction.bind(null, conversationId, messageId, "rejected")}>
          <Button size="sm" type="submit" variant="outline">
            Rejeitar
          </Button>
        </form>
        <form action={reviewDraftAction.bind(null, conversationId, messageId, "escalated")}>
          <Button size="sm" type="submit" variant="ghost">
            <ShieldAlert className="size-3.5" />
            Escalar
          </Button>
        </form>
      </div>
    </div>
  );
}
