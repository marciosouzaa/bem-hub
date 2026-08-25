import type { SupportConversation } from "@/features/support/queries";

type SupportMessage = SupportConversation["messages"][number];

export function getSupportMessageActionAvailability(message: SupportMessage) {
  const downloadableAttachments = message.attachments.filter(
    (attachment) => attachment.status === "available",
  );

  return {
    canCopy: canCopySupportMessage(message),
    canDelete: false,
    canDownload: downloadableAttachments.length > 0,
    canEdit: false,
    canReply: message.canReply,
    downloadableAttachments,
  };
}

export function getSupportMessageDisplayState(message: SupportMessage) {
  const hidesAttachmentFallback = message.attachments.some(
    (attachment) => message.content === `Arquivo: ${attachment.fileName}`,
  );

  return {
    hidesAttachmentFallback,
    showContent: !hidesAttachmentFallback
      && (message.content !== "Mídia recebida" || !message.attachments.length),
  };
}

function canCopySupportMessage(message: SupportMessage) {
  const normalizedContent = message.content.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  return message.content.trim().length > 0
    && !(normalizedContent === "midia recebida" && message.attachments.length);
}
