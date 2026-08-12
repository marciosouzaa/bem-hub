import "server-only";

import { z } from "zod";

import { deliverSupportMediaAttempt, getSupportDeliveryContext, supportMessageBeginResultSchema } from "@/features/support/support-message-delivery";

const maxSize = 25 * 1024 * 1024;
const acceptedTypes = new Map<string, "audio" | "document" | "image" | "video">([
  ["image/jpeg", "image"], ["image/png", "image"], ["image/webp", "image"],
  ["video/mp4", "video"], ["audio/mpeg", "audio"], ["audio/mp4", "audio"],
  ["audio/ogg", "audio"], ["application/pdf", "document"], ["text/plain", "document"],
  ["text/csv", "document"], ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "document"],
]);

export async function sendSupportMedia(input: { caption: string; clientRequestId: string; conversationId: string; file: File; replyToMessageId?: string }) {
  const parsed = z.object({ caption: z.string().trim().max(10_000), clientRequestId: z.string().uuid(), conversationId: z.string().uuid(), replyToMessageId: z.string().uuid().optional() }).parse(input);
  if (!input.file.size || input.file.size > maxSize) throw new Error("O arquivo deve ter até 25 MB.");
  const mediaType = acceptedTypes.get(input.file.type);
  if (!mediaType) throw new Error("Formato de arquivo não suportado.");

  const { admin, organizationId, supabase } = await getSupportDeliveryContext();
  const content = parsed.caption || `Arquivo: ${input.file.name}`;
  const { data: begun, error: beginError } = await supabase.rpc(parsed.replyToMessageId ? "begin_support_message_reply" : "begin_support_message_send", {
    message_content: content,
    request_id: parsed.clientRequestId,
    target_conversation_id: parsed.conversationId,
    target_organization_id: organizationId,
    ...(parsed.replyToMessageId ? { target_reply_to_message_id: parsed.replyToMessageId } : {}),
  });
  if (beginError) throw new Error("Não foi possível preparar o envio do arquivo.");
  const begin = supportMessageBeginResultSchema.parse(begun);
  if (!begin.created) return { duplicate: true, messageId: begin.messageId, status: begin.status === "sending" ? "sending" : "sent" };

  const attachmentId = crypto.randomUUID();
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "arquivo";
  const path = `${organizationId}/${begin.messageId}/${attachmentId}/${safeName}`;
  const { error: uploadError } = await admin.storage.from("support-message-media").upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (uploadError) throw new Error("Não foi possível guardar o arquivo.");
  const { error: insertError } = await admin.from("support_message_attachments").insert({
    id: attachmentId, organization_id: organizationId, message_id: begin.messageId,
    media_type: mediaType, mime_type: input.file.type, file_name: input.file.name, byte_size: input.file.size,
    storage_object_path: path, status: "available", available_at: new Date().toISOString(),
  });
  if (insertError) {
    await admin.storage.from("support-message-media").remove([path]);
    throw new Error("Não foi possível registrar o arquivo.");
  }
  const bytes = Buffer.from(await input.file.arrayBuffer());
  return deliverSupportMediaAttempt(admin, organizationId, begin, {
    caption: parsed.caption || undefined, dataUrl: `data:${input.file.type};base64,${bytes.toString("base64")}`,
    fileName: input.file.name, mediaType, mimeType: input.file.type, recipient: "", trackingId: begin.messageId,
  });
}
