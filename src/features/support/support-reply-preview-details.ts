import type { SupportConversation } from "@/features/support/queries";

type SupportReply = NonNullable<SupportConversation["messages"][number]["replyTo"]>;

export function getSupportReplyPreview(replyTo: SupportReply) {
  const attachment = replyTo.attachments[0] ?? null;
  const mediaLabel = attachment
    ? ({
      audio: "Áudio",
      document: "Documento",
      image: "Foto",
      video: "Vídeo",
    } as const)[attachment.mediaType]
    : null;
  const fallbackContents = new Set([
    "Mídia recebida",
    attachment?.fileName ? `Arquivo: ${attachment.fileName}` : "",
  ]);

  return {
    attachment,
    content: fallbackContents.has(replyTo.content) ? null : replyTo.content,
    mediaLabel,
    sourceLabel: replyTo.direction === "outbound" ? "Equipe" : "Contato",
  };
}
