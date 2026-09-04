"use client";

import { X } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";
import type { SupportConversation } from "@/features/support/queries";
import { SupportReplyPreview } from "@/features/support/support-reply-preview";

export function SupportReplyContext({ onCancel, replyTo }: { onCancel: () => void; replyTo: SupportConversation["messages"][number] }) {
  return <div className="mx-1 mt-1 flex items-start gap-2"><SupportReplyPreview className="flex-1 border-primary/20 bg-primary/5" replyTo={replyTo} /><IconButton label="Cancelar resposta" onClick={onCancel} size="sm" variant="ghost"><X className="size-3.5" /></IconButton></div>;
}
