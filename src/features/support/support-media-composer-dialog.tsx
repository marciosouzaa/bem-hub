"use client";

import { LoaderCircle, Plus, SendHorizontal, X } from "lucide-react";
import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { IconButton } from "@/components/ui/icon-button";
import { Textarea } from "@/components/ui/textarea";
import type { PendingMedia } from "@/features/support/support-message-composer-types";
import { SupportPendingMediaPreview } from "@/features/support/support-pending-media-preview";
import { SupportAudioPlayer } from "@/features/support/support-audio-player";

export function SupportMediaComposerDialog({ activeMedia, activeIndex, fileInputRef, mediaError, mediaItems, onCaptionChange, onClose, onRemove, onSelect, onSend, open, sending }: {
  activeMedia: PendingMedia | undefined; activeIndex: number; fileInputRef: RefObject<HTMLInputElement | null>; mediaError: string | null; mediaItems: PendingMedia[];
  onCaptionChange: (caption: string) => void; onClose: () => void; onRemove: (id: string) => void; onSelect: (id: string) => void; onSend: () => void; open: boolean; sending: boolean;
}) {
  return <Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}><DialogContent className="grid h-[min(760px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-[920px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[#090b0a] p-0" showClose={false}>
    <header className="flex items-center justify-between gap-3 border-b border-panel-border px-4 py-3 sm:px-5"><div className="min-w-0"><p className="font-medium">Enviar mídias</p><p className="text-xs text-muted">{mediaItems.length} selecionada{mediaItems.length === 1 ? "" : "s"}</p></div><IconButton label="Fechar" onClick={onClose} size="sm" variant="ghost"><X className="size-4" /></IconButton></header>
    {activeMedia ? <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto_auto]"><div className="flex min-h-0 items-center justify-center overflow-hidden bg-black/55 p-5 sm:p-8">{activeMedia.file.type.startsWith("audio/") && activeMedia.previewUrl ? <SupportAudioPlayer src={activeMedia.previewUrl} /> : <SupportPendingMediaPreview item={activeMedia} />}</div>{mediaItems.length > 1 ? <div aria-label="Mídias selecionadas" className="flex gap-2 overflow-x-auto border-t border-panel-border bg-[#0d100f] px-4 py-3" role="tablist">{mediaItems.map((item, index) => <button aria-label={`Selecionar ${item.file.name}`} aria-selected={index === activeIndex} className={`relative h-14 w-[76px] shrink-0 overflow-hidden rounded-md border ${index === activeIndex ? "border-primary ring-1 ring-primary" : "border-panel-border opacity-70 hover:opacity-100"}`} key={item.id} onClick={() => onSelect(item.id)} role="tab" type="button"><SupportPendingMediaPreview compact item={item} /></button>)}</div> : null}<div className="border-t border-panel-border bg-panel px-4 py-3 sm:px-5"><div className="mb-2 flex items-center justify-between gap-3"><p className="truncate text-xs font-medium text-muted-strong">{activeMedia.file.name} · {Math.ceil(activeMedia.file.size / 1024)} KB</p><button aria-label={`Remover ${activeMedia.file.name}`} className="shrink-0 text-muted hover:text-danger" onClick={() => onRemove(activeMedia.id)} type="button"><X className="size-4" /></button></div><Textarea aria-label={`Legenda para ${activeMedia.file.name}`} className="min-h-16 resize-none bg-panel-subtle text-sm" disabled={sending} maxLength={10_000} onChange={(event) => onCaptionChange(event.target.value)} placeholder="Adicione uma legenda..." value={activeMedia.caption} /></div></div> : null}
    <footer className="flex items-center justify-between gap-3 border-t border-panel-border bg-[#0d100f] px-4 py-3 sm:px-5"><Button disabled={sending} onClick={() => fileInputRef.current?.click()} size="sm" type="button" variant="ghost"><Plus className="size-4" />Adicionar</Button><div className="flex items-center gap-2">{mediaError ? <FeedbackMessage className="hidden max-w-72 py-1.5 text-right text-xs sm:flex" variant="error">{mediaError}</FeedbackMessage> : null}<Button disabled={sending || !mediaItems.length} onClick={onSend} size="sm" type="button">{sending ? <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" /> : <SendHorizontal className="size-3.5" />}{sending ? "Enviando" : `Enviar ${mediaItems.length || ""}`}</Button></div></footer>
  </DialogContent></Dialog>;
}
