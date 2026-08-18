"use client";

/* eslint-disable @next/next/no-img-element */

import {
  CheckCircle2,
  FileText,
  Headphones,
  LoaderCircle,
  Paperclip,
  Plus,
  SendHorizontal,
  Video,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Textarea } from "@/components/ui/textarea";
import type { SupportConversation } from "@/features/support/queries";
import { SupportReplyPreview } from "@/features/support/support-reply-preview";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const ACCEPTED_MEDIA = "image/jpeg,image/png,image/webp,video/mp4,audio/mpeg,audio/mp4,audio/ogg,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type PendingMedia = {
  caption: string;
  file: File;
  id: string;
  previewUrl: string | null;
};

type PreparedMediaPayload = {
  attachment: {
    byteSize: number;
    fileName: string;
    id: string;
    mediaType: "audio" | "document" | "image" | "video";
    mimeType: string;
  };
  begin: {
    attemptId: string;
    messageId: string;
  };
  upload: {
    bucket: string;
    path: string;
    token: string;
  };
};

function pendingMediaPreview(item: PendingMedia, compact = false) {
  const sharedClassName = compact ? "size-full object-cover" : "max-h-full max-w-full object-contain";

  if (item.file.type.startsWith("image/")) {
    return <img alt={item.file.name} className={sharedClassName} src={item.previewUrl ?? undefined} />;
  }

  const Icon = item.file.type.startsWith("video/") ? Video : item.file.type.startsWith("audio/") ? Headphones : FileText;
  return <span className={`flex items-center justify-center bg-black/35 text-primary ${compact ? "size-full" : "size-20 rounded-2xl"}`}><Icon className={compact ? "size-4" : "size-9"} /></span>;
}

function isPreparedMediaPayload(value: unknown): value is PreparedMediaPayload {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const upload = record.upload as Record<string, unknown> | undefined;
  const attachment = record.attachment as Record<string, unknown> | undefined;
  const begin = record.begin as Record<string, unknown> | undefined;
  return typeof upload?.bucket === "string"
    && typeof upload.path === "string"
    && typeof upload.token === "string"
    && typeof attachment?.id === "string"
    && typeof attachment.fileName === "string"
    && typeof attachment.mimeType === "string"
    && typeof attachment.byteSize === "number"
    && ["audio", "document", "image", "video"].includes(String(attachment.mediaType))
    && typeof begin?.attemptId === "string"
    && typeof begin.messageId === "string";
}

function isDuplicateMediaPayload(value: unknown) {
  return Boolean(
    value
    && typeof value === "object"
    && "duplicate" in value
    && value.duplicate === true,
  );
}

function readPayloadMessage(value: unknown) {
  return value
    && typeof value === "object"
    && "message" in value
    && typeof value.message === "string"
    ? value.message
    : null;
}

export function SupportMessageComposer({
  assigned,
  canSend,
  channelStatus,
  conversationId,
  onOptimisticFailure,
  onOptimisticSend,
  onOptimisticSuccess,
  onReplyToChange,
  replyTo,
  status,
}: {
  assigned: boolean;
  canSend: boolean;
  channelStatus: SupportConversation["channel"]["operationalStatus"];
  conversationId: string;
  onOptimisticFailure: (requestId: string) => void;
  onOptimisticSend: (input: {
    content: string;
    replyTo: SupportConversation["messages"][number] | null;
    requestId: string;
  }) => void;
  onOptimisticSuccess: (requestId: string, messageId: string | null) => void;
  onReplyToChange: (message: SupportConversation["messages"][number] | null) => void;
  replyTo: SupportConversation["messages"][number] | null;
  status: SupportConversation["status"];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<PendingMedia[]>([]);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const activeIndex = Math.max(0, mediaItems.findIndex((item) => item.id === activeMediaId));
  const activeMedia = mediaItems[activeIndex];

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

  if (channelStatus !== "connected") {
    return (
      <div className="border-t border-panel-border bg-panel-subtle px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-center text-sm text-muted-strong">
          {channelStatus === "inactive"
            ? "Canal inativo. O histórico está preservado, mas novas mensagens não podem ser enviadas."
            : "Canal desconectado. Reconecte-o em Canais antes de responder."}
        </div>
      </div>
    );
  }

  if (!canSend) {
    return (
      <div className="border-t border-panel-border bg-panel-subtle px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-center text-sm text-muted-strong">
          {assigned
            ? "Atendimento com outro responsável. Peça a transferência para responder."
            : "Assuma o atendimento antes de responder ao contato."}
        </div>
      </div>
    );
  }

  function clearMedia() {
    mediaItems.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
    setMediaItems([]);
    setActiveMediaId(null);
    setMediaError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function closeMediaDialog() {
    setMediaDialogOpen(false);
    clearMedia();
  }

  function addMedia(files: FileList | null) {
    if (!files?.length) return;
    const additions = Array.from(files).map((file) => ({
      caption: "",
      file,
      id: crypto.randomUUID(),
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));

    setMediaItems((current) => [...current, ...additions]);
    setActiveMediaId((current) => current ?? additions[0].id);
    setMediaError(null);
    setMediaDialogOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeMedia(id: string) {
    const removed = mediaItems.find((item) => item.id === id);
    if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    const remaining = mediaItems.filter((item) => item.id !== id);
    setMediaItems(remaining);
    setActiveMediaId((current) => current === id ? (remaining[0]?.id ?? null) : current);
    if (!remaining.length) setMediaDialogOpen(false);
  }

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
        const response = await fetch("/api/support/messages", {
          body: JSON.stringify({
            action: "send",
            clientRequestId: requestId,
            content: message,
            conversationId,
            ...(replyToMessageId ? { replyToMessageId } : {}),
          }),
          headers: { "Content-Type": "application/json" }, method: "POST",
        });
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

  async function sendMedia() {
    if (!mediaItems.length || sending) return;
    setError(null);
    setMediaError(null);
    setSending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      for (const item of mediaItems) {
        const caption = item.caption.trim();
        const prepareResponse = await fetch("/api/support/media", {
          body: JSON.stringify({
            action: "prepare",
            byteSize: item.file.size,
            caption,
            clientRequestId: crypto.randomUUID(),
            conversationId,
            fileName: item.file.name,
            mimeType: item.file.type,
            ...(replyTo?.id ? { replyToMessageId: replyTo.id } : {}),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const prepared: unknown = await prepareResponse.json().catch(() => null);
        if (!prepareResponse.ok) {
          throw new Error(readPayloadMessage(prepared) ?? `Não foi possível preparar ${item.file.name}.`);
        }
        if (isDuplicateMediaPayload(prepared)) {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
          setMediaItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
          continue;
        }
        if (!isPreparedMediaPayload(prepared)) {
          throw new Error(`Não foi possível preparar ${item.file.name}.`);
        }

        const { error: uploadError } = await supabase.storage
          .from(prepared.upload.bucket)
          .uploadToSignedUrl(
            prepared.upload.path,
            prepared.upload.token,
            item.file,
            { contentType: item.file.type },
          );
        if (uploadError) {
          await fetch("/api/support/media", {
            body: JSON.stringify({
              action: "fail",
              attachmentId: prepared.attachment.id,
              attemptId: prepared.begin.attemptId,
              messageId: prepared.begin.messageId,
              path: prepared.upload.path,
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          }).catch(() => null);
          throw new Error(`Não foi possível enviar ${item.file.name} para o armazenamento.`);
        }

        const deliverResponse = await fetch("/api/support/media", {
          body: JSON.stringify({
            action: "deliver",
            attachmentId: prepared.attachment.id,
            attemptId: prepared.begin.attemptId,
            byteSize: prepared.attachment.byteSize,
            caption,
            fileName: prepared.attachment.fileName,
            mediaType: prepared.attachment.mediaType,
            messageId: prepared.begin.messageId,
            mimeType: prepared.attachment.mimeType,
            path: prepared.upload.path,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const delivered: unknown = await deliverResponse.json().catch(() => null);
        if (!deliverResponse.ok) {
          throw new Error(readPayloadMessage(delivered) ?? `Não foi possível enviar ${item.file.name}.`);
        }
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        setMediaItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      }

      setMediaDialogOpen(false);
      setActiveMediaId(null);
      router.refresh();
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (submitError) {
      setMediaError(submitError instanceof Error ? submitError.message : "Não foi possível enviar as mídias.");
    } finally {
      setSending(false);
    }
  }
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    formRef.current?.requestSubmit();
  }

  return (
    <div className="border-t border-panel-border bg-panel-subtle px-3 py-3 sm:px-5">
      <form className="mx-auto max-w-3xl rounded-[16px] border border-panel-border bg-panel p-2 shadow-[var(--shadow-card)] focus-within:border-primary/35 focus-within:shadow-[var(--shadow-focus)]" onSubmit={handleSubmit} ref={formRef}>
        {replyTo ? (
          <div className="mx-1 mt-1 flex items-start gap-2">
            <SupportReplyPreview className="flex-1 border-primary/20 bg-primary/5" replyTo={replyTo} />
            <IconButton label="Cancelar resposta" onClick={() => onReplyToChange(null)} size="sm" variant="ghost">
              <X className="size-3.5" />
            </IconButton>
          </div>
        ) : null}
        <Textarea aria-label="Mensagem para o contato" className="min-h-20 resize-none border-0 bg-transparent focus:ring-0" maxLength={10_000} onChange={(event) => setContent(event.target.value)} onKeyDown={handleKeyDown} placeholder="Digite uma mensagem..." ref={textareaRef} value={content} />
        <div className="flex items-end justify-between gap-3 border-t border-panel-border px-2 pb-1 pt-2">
          <div>
            <p className="text-[11px] leading-4 text-muted">Enter envia · Shift + Enter quebra a linha</p>
            {error ? <p aria-live="polite" className="mt-1 text-xs text-danger">{error}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <input accept={ACCEPTED_MEDIA} className="sr-only" multiple onChange={(event) => addMedia(event.target.files)} ref={fileInputRef} type="file" />
            <Button aria-label="Anexar mídias" disabled={sending} onClick={() => fileInputRef.current?.click()} size="icon" type="button" variant="ghost"><Paperclip className="size-4" /></Button>
            <Button disabled={!content.trim()} size="sm" type="submit">
              <SendHorizontal className="size-3.5" />
              Enviar
            </Button>
          </div>
        </div>
      </form>

      <Dialog onOpenChange={(open) => !open && closeMediaDialog()} open={mediaDialogOpen}>
        <DialogContent className="grid h-[min(760px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-[920px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[#090b0a] p-0" showClose={false}>
          <header className="flex items-center justify-between gap-3 border-b border-panel-border px-4 py-3 sm:px-5">
            <div className="min-w-0"><p className="font-medium">Enviar mídias</p><p className="text-xs text-muted">{mediaItems.length} selecionada{mediaItems.length === 1 ? "" : "s"}</p></div>
            <IconButton label="Fechar" onClick={closeMediaDialog} size="sm" variant="ghost"><X className="size-4" /></IconButton>
          </header>

          {activeMedia ? <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto_auto]">
            <div className="flex min-h-0 items-center justify-center overflow-hidden bg-black/55 p-5 sm:p-8">
              {pendingMediaPreview(activeMedia)}
            </div>
            {mediaItems.length > 1 ? <div aria-label="Mídias selecionadas" className="flex gap-2 overflow-x-auto border-t border-panel-border bg-[#0d100f] px-4 py-3" role="tablist">
              {mediaItems.map((item, index) => <button aria-label={`Selecionar ${item.file.name}`} aria-selected={index === activeIndex} className={`relative h-14 w-[76px] shrink-0 overflow-hidden rounded-md border ${index === activeIndex ? "border-primary ring-1 ring-primary" : "border-panel-border opacity-70 hover:opacity-100"}`} key={item.id} onClick={() => setActiveMediaId(item.id)} role="tab" type="button">{pendingMediaPreview(item, true)}</button>)}
            </div> : null}
            <div className="border-t border-panel-border bg-panel px-4 py-3 sm:px-5">
              <div className="mb-2 flex items-center justify-between gap-3"><p className="truncate text-xs font-medium text-muted-strong">{activeMedia.file.name} · {Math.ceil(activeMedia.file.size / 1024)} KB</p><button aria-label={`Remover ${activeMedia.file.name}`} className="shrink-0 text-muted hover:text-danger" onClick={() => removeMedia(activeMedia.id)} type="button"><X className="size-4" /></button></div>
              <Textarea aria-label={`Legenda para ${activeMedia.file.name}`} className="min-h-16 resize-none bg-panel-subtle text-sm" disabled={sending} maxLength={10_000} onChange={(event) => setMediaItems((current) => current.map((item) => item.id === activeMedia.id ? { ...item, caption: event.target.value } : item))} placeholder="Adicione uma legenda..." value={activeMedia.caption} />
            </div>
          </div> : null}

          <footer className="flex items-center justify-between gap-3 border-t border-panel-border bg-[#0d100f] px-4 py-3 sm:px-5">
            <Button disabled={sending} onClick={() => fileInputRef.current?.click()} size="sm" type="button" variant="ghost"><Plus className="size-4" />Adicionar</Button>
            <div className="flex items-center gap-2">
              {mediaError ? <p aria-live="polite" className="hidden max-w-72 text-right text-xs text-danger sm:block">{mediaError}</p> : null}
              <Button disabled={sending || !mediaItems.length} onClick={sendMedia} size="sm" type="button">{sending ? <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" /> : <SendHorizontal className="size-3.5" />}{sending ? "Enviando" : `Enviar ${mediaItems.length || ""}`}</Button>
            </div>
          </footer>
        </DialogContent>
      </Dialog>
    </div>
  );
}
