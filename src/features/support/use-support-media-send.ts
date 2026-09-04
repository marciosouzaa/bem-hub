"use client";

import { useRef, useState } from "react";

import type { SupportConversation } from "@/features/support/queries";
import type { PendingMedia, PreparedMediaPayload } from "@/features/support/support-message-composer-types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function isPreparedMediaPayload(value: unknown): value is PreparedMediaPayload {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const upload = record.upload as Record<string, unknown> | undefined;
  const attachment = record.attachment as Record<string, unknown> | undefined;
  const begin = record.begin as Record<string, unknown> | undefined;
  return typeof upload?.bucket === "string" && typeof upload.path === "string" && typeof upload.token === "string" && typeof attachment?.id === "string" && typeof attachment.fileName === "string" && typeof attachment.mimeType === "string" && typeof attachment.byteSize === "number" && ["audio", "document", "image", "video"].includes(String(attachment.mediaType)) && typeof begin?.attemptId === "string" && typeof begin.messageId === "string";
}

function isDuplicateMediaPayload(value: unknown) {
  return Boolean(value && typeof value === "object" && "duplicate" in value && value.duplicate === true);
}

function readPayloadMessage(value: unknown) {
  return value && typeof value === "object" && "message" in value && typeof value.message === "string" ? value.message : null;
}

export function useSupportMediaSend({ conversationId, onSent, replyTo }: {
  conversationId: string;
  onSent: () => void;
  replyTo: SupportConversation["messages"][number] | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<PendingMedia[]>([]);
  const [sending, setSending] = useState(false);
  const activeIndex = Math.max(0, mediaItems.findIndex((item) => item.id === activeMediaId));
  const activeMedia = mediaItems[activeIndex];

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

  function addMedia(files: FileList | File[] | null) {
    if (!files?.length) return;
    const additions = Array.from(files).map((file) => ({ caption: "", file, id: crypto.randomUUID(), previewUrl: file.type.startsWith("image/") || file.type.startsWith("audio/") ? URL.createObjectURL(file) : null }));
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

  function updateCaption(caption: string) {
    if (!activeMedia) return;
    setMediaItems((current) => current.map((item) => item.id === activeMedia.id ? { ...item, caption } : item));
  }

  async function sendMedia(itemsOverride?: PendingMedia[], throwOnError = false) {
    const items = itemsOverride ?? mediaItems;
    if (!items.length || sending) return;
    setMediaError(null);
    setSending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      for (const item of items) {
        const caption = item.caption.trim();
        const prepareResponse = await fetch("/api/support/media", { body: JSON.stringify({ action: "prepare", byteSize: item.file.size, caption, clientRequestId: crypto.randomUUID(), conversationId, fileName: item.file.name, mimeType: item.file.type, ...(replyTo?.id ? { replyToMessageId: replyTo.id } : {}) }), headers: { "Content-Type": "application/json" }, method: "POST" });
        const prepared: unknown = await prepareResponse.json().catch(() => null);
        if (!prepareResponse.ok) throw new Error(readPayloadMessage(prepared) ?? `Não foi possível preparar ${item.file.name}.`);
        if (isDuplicateMediaPayload(prepared)) {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
          setMediaItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
          continue;
        }
        if (!isPreparedMediaPayload(prepared)) throw new Error(`Não foi possível preparar ${item.file.name}.`);
        const { error: uploadError } = await supabase.storage.from(prepared.upload.bucket).uploadToSignedUrl(prepared.upload.path, prepared.upload.token, item.file, { contentType: item.file.type });
        if (uploadError) {
          await fetch("/api/support/media", { body: JSON.stringify({ action: "fail", attachmentId: prepared.attachment.id, attemptId: prepared.begin.attemptId, messageId: prepared.begin.messageId, path: prepared.upload.path }), headers: { "Content-Type": "application/json" }, method: "POST" }).catch(() => null);
          throw new Error(`Não foi possível enviar ${item.file.name} para o armazenamento.`);
        }
        const deliverResponse = await fetch("/api/support/media", { body: JSON.stringify({ action: "deliver", attachmentId: prepared.attachment.id, attemptId: prepared.begin.attemptId, byteSize: prepared.attachment.byteSize, caption, fileName: prepared.attachment.fileName, mediaType: prepared.attachment.mediaType, messageId: prepared.begin.messageId, mimeType: prepared.attachment.mimeType, path: prepared.upload.path }), headers: { "Content-Type": "application/json" }, method: "POST" });
        const delivered: unknown = await deliverResponse.json().catch(() => null);
        if (!deliverResponse.ok) throw new Error(readPayloadMessage(delivered) ?? `Não foi possível enviar ${item.file.name}.`);
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        setMediaItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      }
      setMediaDialogOpen(false);
      setActiveMediaId(null);
      onSent();
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Não foi possível enviar as mídias.");
      if (throwOnError) throw error;
    } finally {
      setSending(false);
    }
  }

  async function sendRecordedAudio(file: File) {
    await sendMedia([{ caption: "", file, id: crypto.randomUUID(), previewUrl: null }], true);
  }

  return { activeIndex, activeMedia, addMedia, closeMediaDialog, fileInputRef, mediaDialogOpen, mediaError, mediaItems, removeMedia, sendMedia, sendRecordedAudio, sending, setActiveMediaId, updateCaption };
}
