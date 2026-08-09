import "server-only";

import { createHash } from "crypto";

import type { ChannelProviderAdapter } from "@/features/channels/providers/channel-provider-adapter";
import type { ChannelMessageEvent } from "@/features/channels/webhooks/contracts";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

const maxSize = 25 * 1024 * 1024;

const acceptedTypes = new Map<string, "audio" | "document" | "image" | "video">([
  ["image/jpeg", "image"], ["image/png", "image"], ["image/webp", "image"],
  ["video/mp4", "video"], ["audio/mpeg", "audio"], ["audio/mp4", "audio"],
  ["audio/ogg", "audio"], ["application/pdf", "document"], ["text/plain", "document"],
  ["text/csv", "document"], ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "document"],
]);

type InboundMessageEvent = Exclude<ChannelMessageEvent, { type: "message.delivery_updated" }>;
type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

export async function storeInboundSupportMedia(input: {
  adapter: ChannelProviderAdapter;
  event: InboundMessageEvent;
  messageId: string;
  organizationId: string;
  supabase: SupabaseAdmin;
}) {
  const media = input.event.media;
  if (!media) return;

  const { data: existing, error: existingError } = await input.supabase
    .from("support_message_attachments")
    .select("id,status")
    .eq("organization_id", input.organizationId)
    .eq("message_id", input.messageId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.status === "available") return;

  const downloaded = media.dataBase64
    ? {
        dataBase64: media.dataBase64,
        fileName: media.fileName,
        mediaType: media.mediaType,
        mimeType: media.mimeType,
      }
    : media.downloadContext && input.adapter.downloadInboundMedia
      ? await input.adapter.downloadInboundMedia({ downloadContext: media.downloadContext })
      : null;

  if (!downloaded) throw new Error("O provedor não disponibilizou a mídia recebida.");

  const mimeType = downloaded.mimeType.split(";", 1)[0].trim().toLowerCase();
  const mediaType = acceptedTypes.get(mimeType);
  if (!mediaType || mediaType !== downloaded.mediaType) {
    throw new Error("Formato de mídia recebida não suportado.");
  }

  const data = Buffer.from(
    downloaded.dataBase64.replace(/^data:[^;]+;base64,/i, ""),
    "base64",
  );
  if (!data.length || data.length > maxSize) {
    throw new Error("A mídia recebida excede o limite de 25 MB ou está vazia.");
  }

  const attachmentId = stableUuid(`${input.messageId}:${input.event.providerMessageId}`);
  const fileName = safeFileName(downloaded.fileName, mimeType, mediaType);
  const path = `${input.organizationId}/${input.messageId}/${attachmentId}/${fileName}`;
  const { error: uploadError } = await input.supabase.storage
    .from("support-message-media")
    .upload(path, data, { contentType: mimeType, upsert: true });
  if (uploadError) throw uploadError;

  const { error: insertError } = await input.supabase
    .from("support_message_attachments")
    .upsert({
      available_at: new Date().toISOString(),
      byte_size: data.length,
      file_name: downloaded.fileName ?? fileName,
      id: attachmentId,
      media_type: mediaType,
      message_id: input.messageId,
      metadata: { providerMessageId: input.event.providerMessageId, source: "channel_webhook" },
      mime_type: mimeType,
      organization_id: input.organizationId,
      status: "available",
      storage_object_path: path,
    }, { onConflict: "id" });
  if (insertError) throw insertError;
}

function stableUuid(value: string) {
  const hash = createHash("sha256").update(value).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function safeFileName(fileName: string | null, mimeType: string, mediaType: string) {
  const safeName = fileName?.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  if (safeName) return safeName;
  const extension = {
    "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/ogg": "ogg",
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4",
  }[mimeType] ?? (mediaType === "document" ? "bin" : "media");
  return `midia.${extension}`;
}
