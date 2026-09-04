"use client";

import { Paperclip, SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { ACCEPTED_MEDIA } from "@/features/support/support-message-composer-types";
import type { SupportConversation } from "@/features/support/queries";
import { SupportReplyContext } from "@/features/support/support-reply-context";
import { SupportAudioRecorder } from "@/features/support/support-audio-recorder";

export function SupportTextComposer({ content, error, fileInputRef, formRef, onAudioSend, onContentChange, onKeyDown, onMediaChange, onReplyCancel, onSubmit, replyTo, sending, textareaRef }: {
  content: string; error: string | null; fileInputRef: RefObject<HTMLInputElement | null>; formRef: RefObject<HTMLFormElement | null>;
  onAudioSend: (file: File) => Promise<void>; onContentChange: (content: string) => void; onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void; onMediaChange: (files: FileList | File[] | null) => void; onReplyCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  replyTo: SupportConversation["messages"][number] | null; sending: boolean; textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [audioState, setAudioState] = useState<"idle" | "paused" | "preview" | "recording">("idle");
  const handleAudioStateChange = useCallback((state: "idle" | "paused" | "preview" | "recording") => {
    setAudioState(state);
    if (state !== "idle" && content) onContentChange("");
  }, [content, onContentChange]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || audioState !== "idle") return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 44), 128)}px`;
  }, [audioState, content, textareaRef]);

  return <form className="mx-auto max-w-3xl rounded-[16px] border border-panel-border bg-panel p-2 shadow-[var(--shadow-card)] focus-within:border-primary/35 focus-within:shadow-[var(--shadow-focus)]" onSubmit={onSubmit} ref={formRef}>
    {replyTo ? <SupportReplyContext onCancel={onReplyCancel} replyTo={replyTo} /> : null}
    {audioState === "idle" ? <Textarea aria-label="Mensagem para o contato" className="h-11 min-h-11 max-h-32 resize-none overflow-y-auto border-0 bg-transparent py-2.5 leading-6 focus:ring-0" maxLength={10_000} onChange={(event) => onContentChange(event.target.value)} onKeyDown={onKeyDown} placeholder="Digite uma mensagem..." ref={textareaRef} rows={1} value={content} /> : null}
    <div className={`flex gap-3 border-t border-panel-border px-2 pb-1 pt-2 ${audioState === "idle" ? "items-end justify-between" : "items-center justify-end"}`}>
      {audioState === "idle" ? <div><p className="text-[11px] leading-4 text-muted">Enter envia · Shift + Enter quebra a linha</p>{error ? <FeedbackMessage className="mt-1 max-w-sm py-1.5 text-xs leading-5" variant="error">{error}</FeedbackMessage> : null}</div> : null}
      <div className={`flex min-w-0 items-center gap-2 ${audioState === "idle" ? "" : "flex-1 justify-end"}`}><input accept={ACCEPTED_MEDIA} className="sr-only" multiple onChange={(event) => onMediaChange(event.target.files)} ref={fileInputRef} type="file" />{audioState === "idle" ? <Button aria-label="Anexar mídias" disabled={sending} onClick={() => fileInputRef.current?.click()} size="icon" type="button" variant="ghost"><Paperclip className="size-4" /></Button> : null}<SupportAudioRecorder disabled={sending} onSend={onAudioSend} onStateChange={handleAudioStateChange} showTrigger={!content.trim()} />{audioState === "idle" && content.trim() ? <Button size="sm" type="submit"><SendHorizontal className="size-3.5" />Enviar</Button> : null}</div>
    </div>
  </form>;
}
