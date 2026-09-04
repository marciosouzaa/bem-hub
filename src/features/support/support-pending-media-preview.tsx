"use client";

/* eslint-disable @next/next/no-img-element */

import { FileText, Headphones, Video } from "lucide-react";

import type { PendingMedia } from "@/features/support/support-message-composer-types";

export function SupportPendingMediaPreview({ compact = false, item }: { compact?: boolean; item: PendingMedia }) {
  const className = compact ? "size-full object-cover" : "max-h-full max-w-full object-contain";
  if (item.file.type.startsWith("image/")) return <img alt={item.file.name} className={className} src={item.previewUrl ?? undefined} />;

  const Icon = item.file.type.startsWith("video/") ? Video : item.file.type.startsWith("audio/") ? Headphones : FileText;
  return <span className={`flex items-center justify-center bg-black/35 text-primary ${compact ? "size-full" : "size-20 rounded-2xl"}`}><Icon className={compact ? "size-4" : "size-9"} /></span>;
}
