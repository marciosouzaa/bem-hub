"use client";

import { CheckCircle2, LoaderCircle, SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SupportConversation } from "@/features/support/queries";

export function SupportMessageComposer({
  conversationId,
  status,
}: {
  conversationId: string;
  status: SupportConversation["status"];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (status === "resolved") {
    return (
      <div className="border-t border-panel-border bg-panel-subtle px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-strong">
          <CheckCircle2 className="size-4 text-primary" />
          Atendimento resolvido. Histórico preservado para consulta.
        </div>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = content.trim();
    if (!message || sending) return;

    setError(null);
    setSending(true);
    try {
      const response = await fetch("/api/support/messages", {
        body: JSON.stringify({
          clientRequestId: crypto.randomUUID(),
          content: message,
          conversationId,
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
          : "Não foi possível enviar a mensagem.";
        throw new Error(providerMessage);
      }

      setContent("");
      router.refresh();
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível enviar a mensagem.",
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter"
      || event.shiftKey
      || event.nativeEvent.isComposing
    ) return;

    event.preventDefault();
    formRef.current?.requestSubmit();
  }

  return (
    <div className="border-t border-panel-border bg-panel-subtle px-3 py-3 sm:px-5">
      <form
        className="mx-auto max-w-3xl rounded-[16px] border border-panel-border bg-panel p-2 shadow-[var(--shadow-card)] focus-within:border-primary/35 focus-within:shadow-[var(--shadow-focus)]"
        onSubmit={handleSubmit}
        ref={formRef}
      >
        <Textarea
          aria-label="Mensagem para o contato"
          className="min-h-20 resize-none border-0 bg-transparent focus:ring-0"
          disabled={sending}
          maxLength={10_000}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem..."
          ref={textareaRef}
          value={content}
        />
        <div className="flex items-end justify-between gap-3 border-t border-panel-border px-2 pb-1 pt-2">
          <div>
            <p className="text-[11px] leading-4 text-muted">
              Enter envia · Shift + Enter quebra a linha
            </p>
            {error ? (
              <p aria-live="polite" className="mt-1 text-xs text-danger">
                {error}
              </p>
            ) : null}
          </div>
          <Button disabled={sending || !content.trim()} size="sm" type="submit">
            {sending ? (
              <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
            ) : (
              <SendHorizontal className="size-3.5" />
            )}
            {sending ? "Enviando" : "Enviar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
