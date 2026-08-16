"use client";

import {
  ChevronDown,
  Clipboard,
  Download,
  Pencil,
  Reply,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SupportConversation } from "@/features/support/queries";
import { downloadSupportAttachment } from "@/features/support/support-attachment-download";

type SupportMessage = SupportConversation["messages"][number];

export function SupportMessageActions({
  message,
  onReplyTo,
}: {
  message: SupportMessage;
  onReplyTo: (message: SupportMessage) => void;
}) {
  const [copying, setCopying] = useState(false);
  const downloadableAttachments = message.attachments.filter(
    (attachment) => attachment.status === "available",
  );
  const normalizedContent = message.content.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
  const canCopy = message.content.trim().length > 0
    && !(normalizedContent === "midia recebida" && message.attachments.length);

  async function copyMessageText() {
    if (!canCopy || copying) return;

    setCopying(true);
    try {
      await navigator.clipboard.writeText(message.content);
    } finally {
      window.setTimeout(() => setCopying(false), 900);
    }
  }

  async function downloadAttachments() {
    for (const attachment of downloadableAttachments) {
      await downloadSupportAttachment(attachment.id, attachment.fileName);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          className="absolute right-1.5 top-1.5 size-7 rounded-lg bg-panel/55 text-muted opacity-0 shadow-none transition hover:bg-panel-elevated hover:text-primary group-hover/message:opacity-100 data-[state=open]:opacity-100 data-[state=open]:text-primary focus-visible:opacity-100"
          label="Opcoes da mensagem"
          size="sm"
          variant="ghost"
        >
          <ChevronDown className="size-3.5" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          disabled={!message.canReply}
          onSelect={() => onReplyTo(message)}
        >
          <Reply className="size-4" />
          Responder
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Pencil className="size-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canCopy || copying} onSelect={copyMessageText}>
          <Clipboard className="size-4" />
          {copying ? "Copiado" : "Copiar"}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!downloadableAttachments.length}
          onSelect={() => void downloadAttachments()}
        >
          <Download className="size-4" />
          Baixar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger disabled>
          <Trash2 className="size-4" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
