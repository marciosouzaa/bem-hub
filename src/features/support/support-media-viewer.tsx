"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Headphones,
  LoaderCircle,
  Minus,
  Play,
  Plus,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { downloadSupportAttachment } from "@/features/support/support-attachment-download";
import { SupportAudioPlayer } from "@/features/support/support-audio-player";
import type { SupportConversation } from "@/features/support/queries";

type Attachment = SupportConversation["messages"][number]["attachments"][number];

function AttachmentPreview({ attachment, className }: { attachment: Attachment; className?: string }) {
  const url = `/api/support/attachments/${attachment.id}`;

  if (attachment.mediaType === "image") {
    return <img alt="" className={`h-full w-full object-cover ${className ?? ""}`} src={url} />;
  }

  if (attachment.mediaType === "video") {
    return <span className={`flex h-full w-full items-center justify-center bg-black/45 ${className ?? ""}`}><Play className="size-4 fill-current" /></span>;
  }

  if (attachment.mediaType === "audio") {
    return <span className={`flex h-full w-full items-center justify-center bg-black/45 ${className ?? ""}`}><Headphones className="size-4" /></span>;
  }

  return <span className={`flex h-full w-full items-center justify-center bg-black/45 ${className ?? ""}`}><FileText className="size-4" /></span>;
}

export function SupportMediaViewer({ attachments, initialId, onClose }: { attachments: Attachment[]; initialId: string | null; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const initialIndex = useMemo(
    () => Math.max(0, attachments.findIndex((item) => item.id === initialId)),
    [attachments, initialId],
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const active = attachments[activeIndex];

  if (!active) return null;

  const url = `/api/support/attachments/${active.id}`;
  const select = (next: number) => {
    setActiveIndex((next + attachments.length) % attachments.length);
    setZoom(1);
  };
  async function downloadActiveAttachment() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadSupportAttachment(active.id, active.fileName);
    } finally {
      setDownloading(false);
    }
  }

  return <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(initialId)}>
    <DialogContent className="grid h-[calc(100dvh-2rem)] max-h-[860px] w-[calc(100vw-2rem)] max-w-[1240px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[#090b0a] p-0" showClose={false}>
      <header className="flex min-w-0 items-center justify-between gap-3 border-b border-panel-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{active.fileName ?? "Mídia"}</p>
          <p className="text-xs text-muted">{Math.ceil(active.byteSize / 1024)} KB · {active.mediaType}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton disabled={downloading} label="Baixar" onClick={() => void downloadActiveAttachment()} size="sm" variant="ghost">{downloading ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : <Download className="size-4" />}</IconButton>
          <IconButton label="Fechar" onClick={onClose} size="sm" variant="ghost"><X className="size-4" /></IconButton>
        </div>
      </header>

      <div className="relative min-h-0 overflow-hidden bg-black/55">
        <div className="flex size-full items-center justify-center overflow-hidden p-5 sm:p-8">
          {active.mediaType === "image" ? (
            <img
              alt={active.fileName ?? "Imagem"}
              className="pointer-events-none max-h-full max-w-full select-none object-contain transition-transform duration-200"
              src={url}
              style={{ transform: `scale(${zoom})` }}
            />
          ) : active.mediaType === "video" ? (
            <video className="max-h-full max-w-full" controls src={url} />
          ) : active.mediaType === "audio" ? (
            <SupportAudioPlayer src={url} />
          ) : (
            <a className="flex flex-col items-center gap-3 text-muted-strong hover:text-primary" href={url} target="_blank">
              <FileText className="size-12" />Abrir documento
            </a>
          )}
        </div>

        {attachments.length > 1 ? <>
          <IconButton className="absolute left-3 top-1/2 z-10 -translate-y-1/2 shadow-lg" label="Mídia anterior" onClick={() => select(activeIndex - 1)} variant="secondary"><ChevronLeft /></IconButton>
          <IconButton className="absolute right-3 top-1/2 z-10 -translate-y-1/2 shadow-lg" label="Próxima mídia" onClick={() => select(activeIndex + 1)} variant="secondary"><ChevronRight /></IconButton>
        </> : null}
      </div>

      <footer className="border-t border-panel-border bg-[#0d100f] px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          {active.mediaType === "image" ? <div className="flex shrink-0 items-center gap-1">
            <IconButton disabled={zoom <= 1} label="Diminuir zoom" onClick={() => setZoom((value) => Math.max(1, value - .25))} size="sm" variant="ghost"><Minus className="size-4" /></IconButton>
            <span className="min-w-11 text-center text-xs tabular-nums text-muted">{Math.round(zoom * 100)}%</span>
            <IconButton disabled={zoom >= 3} label="Aumentar zoom" onClick={() => setZoom((value) => Math.min(3, value + .25))} size="sm" variant="ghost"><Plus className="size-4" /></IconButton>
          </div> : <span />}
          <span className="shrink-0 text-xs text-muted">{activeIndex + 1} de {attachments.length}</span>
        </div>

        {attachments.length > 1 ? <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5" role="tablist" aria-label="Outras mídias da conversa">
          {attachments.map((item, itemIndex) => <button
            aria-label={`Abrir ${item.fileName ?? "mídia"}`}
            aria-selected={itemIndex === activeIndex}
            className={`relative h-14 w-[76px] shrink-0 overflow-hidden rounded-md border transition-colors ${itemIndex === activeIndex ? "border-primary ring-1 ring-primary" : "border-panel-border opacity-70 hover:opacity-100"}`}
            key={item.id}
            onClick={() => select(itemIndex)}
            role="tab"
            type="button"
          >
            <AttachmentPreview attachment={item} />
          </button>)}
        </div> : null}
      </footer>
    </DialogContent>
  </Dialog>;
}
