"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type KeyboardEvent, useRef, useState } from "react";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import type { SupportConversation } from "@/features/support/queries";
import { SupportMediaComposerDialog } from "@/features/support/support-media-composer-dialog";
import { SupportTextComposer } from "@/features/support/support-text-composer";
import { useSupportMediaSend } from "@/features/support/use-support-media-send";

type ComposerProps = {
  assigned: boolean;
  canSend: boolean;
  channelStatus: SupportConversation["channel"]["operationalStatus"];
  conversationId: string;
  onOptimisticFailure: (requestId: string) => void;
  onOptimisticSend: (input: { content: string; replyTo: SupportConversation["messages"][number] | null; requestId: string }) => void;
  onOptimisticSuccess: (requestId: string, messageId: string | null) => void;
  onReplyToChange: (message: SupportConversation["messages"][number] | null) => void;
  replyTo: SupportConversation["messages"][number] | null;
  status: SupportConversation["status"];
};

export function SupportMessageComposer({ assigned, canSend, channelStatus, conversationId, onOptimisticFailure, onOptimisticSend, onOptimisticSuccess, onReplyToChange, replyTo, status }: ComposerProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const media = useSupportMediaSend({ conversationId, replyTo, onSent: () => { router.refresh(); requestAnimationFrame(() => textareaRef.current?.focus()); } });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = content.trim();
    if (!message) return;
    const requestId = crypto.randomUUID();
    const replyToMessageId = replyTo?.id;
    setError(null);
    setContent("");
    onOptimisticSend({ content: message, replyTo, requestId });
    onReplyToChange(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
    void (async () => {
      try {
        const response = await fetch("/api/support/messages", { body: JSON.stringify({ action: "send", clientRequestId: requestId, content: message, conversationId, ...(replyToMessageId ? { replyToMessageId } : {}) }), headers: { "Content-Type": "application/json" }, method: "POST" });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string" ? payload.message : "Não foi possível enviar a mensagem.");
        const messageId = payload && typeof payload === "object" && "messageId" in payload && typeof payload.messageId === "string" ? payload.messageId : null;
        onOptimisticSuccess(requestId, messageId);
        router.refresh();
      } catch (submitError) {
        onOptimisticFailure(requestId);
        setError(submitError instanceof Error ? submitError.message : "Não foi possível enviar a mensagem.");
        router.refresh();
      }
    })();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    formRef.current?.requestSubmit();
  }

  if (status === "resolved") return <ComposerNotice icon={<CheckCircle2 className="size-4 text-primary" />}>Atendimento finalizado. Histórico preservado para consulta.</ComposerNotice>;
  if (channelStatus !== "connected") return <ComposerNotice variant="warning">{channelStatus === "inactive" ? "Canal inativo. O histórico está preservado, mas novas mensagens não podem ser enviadas." : "Canal desconectado. Reconecte-o em Canais antes de responder."}</ComposerNotice>;
  if (!canSend) return <ComposerNotice variant="warning">{assigned ? "Atendimento com outro responsável. Peça a transferência para responder." : "Assuma o atendimento antes de responder ao contato."}</ComposerNotice>;

  return <div className="border-t border-panel-border bg-panel-subtle px-3 py-3 sm:px-5">
    <SupportTextComposer content={content} error={error} fileInputRef={media.fileInputRef} formRef={formRef} onAudioSend={media.sendRecordedAudio} onContentChange={setContent} onKeyDown={handleKeyDown} onMediaChange={media.addMedia} onReplyCancel={() => onReplyToChange(null)} onSubmit={handleSubmit} replyTo={replyTo} sending={media.sending} textareaRef={textareaRef} />
    <SupportMediaComposerDialog activeMedia={media.activeMedia} activeIndex={media.activeIndex} fileInputRef={media.fileInputRef} mediaError={media.mediaError} mediaItems={media.mediaItems} onCaptionChange={media.updateCaption} onClose={media.closeMediaDialog} onRemove={media.removeMedia} onSelect={media.setActiveMediaId} onSend={() => void media.sendMedia()} open={media.mediaDialogOpen} sending={media.sending} />
  </div>;
}

function ComposerNotice({ children, icon, variant = "info" }: { children: React.ReactNode; icon?: React.ReactNode; variant?: "info" | "warning" }) {
  return <div className="border-t border-panel-border bg-panel-subtle px-4 py-4 sm:px-6"><FeedbackMessage className="mx-auto max-w-3xl justify-center text-center" variant={variant}>{icon}{children}</FeedbackMessage></div>;
}
