"use client";

/* eslint-disable @next/next/no-img-element */

import { FileText, Headphones, Image as ImageIcon, Play, Video } from "lucide-react";

import type { SupportConversation } from "@/features/support/queries";
import { getSupportReplyPreview } from "@/features/support/support-reply-preview-details";
import { cn } from "@/lib/utils";

export function SupportReplyPreview({
  className,
  onOpenAttachment,
  replyTo,
}: {
  className?: string;
  onOpenAttachment?: (attachmentId: string) => void;
  replyTo: NonNullable<SupportConversation["messages"][number]["replyTo"]>;
}) {
  const { attachment, content, mediaLabel, sourceLabel } = getSupportReplyPreview(replyTo);
  const MediaIcon = attachment?.mediaType === "audio"
    ? Headphones
    : attachment?.mediaType === "document"
      ? FileText
      : attachment?.mediaType === "video"
        ? Video
        : ImageIcon;
  const attachmentUrl = attachment ? `/api/support/attachments/${attachment.id}` : null;
  const mediaPreview = attachment ? (
    attachment.mediaType === "image" ? (
      <img alt="Imagem citada" className="size-11 object-cover" src={attachmentUrl ?? undefined} />
    ) : (
      <span className="relative flex size-11 items-center justify-center bg-black/30 text-primary">
        <MediaIcon className="size-4" />
        {attachment.mediaType === "video" ? <Play className="absolute size-3 fill-current" /> : null}
      </span>
    )
  ) : null;

  return (
    <div className={cn("flex min-w-0 gap-2 rounded-lg border px-2.5 py-2 text-left", className)}>
      <span aria-hidden="true" className="w-0.5 shrink-0 rounded-full bg-primary/85" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-muted-strong">{sourceLabel}</p>
        {mediaLabel ? (
          <p className="mt-0.5 flex items-center gap-1 text-xs leading-4 text-muted">
            <MediaIcon className="size-3 shrink-0" />
            <span>{mediaLabel}{attachment && attachment.fileName ? ` · ${attachment.fileName}` : ""}</span>
          </p>
        ) : null}
        {content ? <p className="line-clamp-2 text-xs leading-4 text-muted">{content}</p> : null}
      </div>
      {attachment ? (
        onOpenAttachment ? (
          <button aria-label={`Abrir ${mediaLabel?.toLocaleLowerCase("pt-BR") ?? "mídia"} citada`} className="shrink-0 overflow-hidden rounded-md border border-panel-border bg-black/20 transition-colors hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" onClick={() => onOpenAttachment(attachment.id)} type="button">
            {mediaPreview}
          </button>
        ) : <span className="shrink-0 overflow-hidden rounded-md border border-panel-border bg-black/20">{mediaPreview}</span>
      ) : null}
    </div>
  );
}
