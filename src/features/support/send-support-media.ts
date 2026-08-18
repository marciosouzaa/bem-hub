import "server-only";

import { z } from "zod";

import {
  deliverSupportMediaAttempt,
  getSupportDeliveryContext,
  supportMessageBeginResultSchema,
} from "@/features/support/support-message-delivery";

const maxSize = 25 * 1024 * 1024;
const bucket = "support-message-media";
const acceptedTypes = new Map<string, "audio" | "document" | "image" | "video">([
  ["image/jpeg", "image"],
  ["image/png", "image"],
  ["image/webp", "image"],
  ["video/mp4", "video"],
  ["audio/mpeg", "audio"],
  ["audio/mp4", "audio"],
  ["audio/ogg", "audio"],
  ["application/pdf", "document"],
  ["text/plain", "document"],
  ["text/csv", "document"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "document",
  ],
]);

const preparedMediaUploadSchema = z.object({
  action: z.literal("prepare"),
  byteSize: z.number().int().positive().max(maxSize),
  caption: z.string().trim().max(10_000),
  clientRequestId: z.string().uuid(),
  conversationId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(255),
  replyToMessageId: z.string().uuid().optional(),
});

const finalizedMediaUploadSchema = z.object({
  action: z.literal("deliver"),
  attachmentId: z.string().uuid(),
  attemptId: z.string().uuid(),
  byteSize: z.number().int().positive().max(maxSize),
  caption: z.string().trim().max(10_000),
  fileName: z.string().trim().min(1).max(255),
  mediaType: z.enum(["audio", "document", "image", "video"]),
  messageId: z.string().uuid(),
  mimeType: z.string().trim().min(3).max(255),
  path: z.string().trim().min(1).max(600),
});

const failedMediaUploadSchema = z.object({
  action: z.literal("fail"),
  attachmentId: z.string().uuid(),
  attemptId: z.string().uuid(),
  messageId: z.string().uuid(),
  path: z.string().trim().min(1).max(600),
});

const signedUploadResponseSchema = z.object({
  path: z.string().trim().min(1),
  token: z.string().trim().min(1),
});

export async function prepareSupportMediaUpload(input: unknown) {
  const parsed = preparedMediaUploadSchema.parse(input);
  const mediaType = assertAcceptedMedia(parsed.mimeType, parsed.byteSize);
  const { admin, organizationId, supabase } = await getSupportDeliveryContext();
  const content = parsed.caption || `Arquivo: ${parsed.fileName}`;
  const { data: begun, error: beginError } = await supabase.rpc(
    parsed.replyToMessageId
      ? "begin_support_message_reply"
      : "begin_support_message_send",
    {
      message_content: content,
      request_id: parsed.clientRequestId,
      target_conversation_id: parsed.conversationId,
      target_organization_id: organizationId,
      ...(parsed.replyToMessageId
        ? { target_reply_to_message_id: parsed.replyToMessageId }
        : {}),
    },
  );
  if (beginError) {
    throw new Error("Não foi possível preparar o envio do arquivo.");
  }

  const begin = supportMessageBeginResultSchema.parse(begun);
  if (!begin.created) {
    return {
      duplicate: true,
      messageId: begin.messageId,
      status: begin.status === "sending" ? "sending" : "sent",
    } as const;
  }

  const attachmentId = crypto.randomUUID();
  const path = `${organizationId}/${begin.messageId}/${attachmentId}/${safeStorageName(parsed.fileName)}`;
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUploadUrl(path);
  if (error || !data) {
    await markPreparedMediaFailed(
      admin,
      organizationId,
      begin.messageId,
      begin.attemptId,
      "storage_signed_upload_unavailable",
    );
    throw new Error("Não foi possível preparar o upload do arquivo.");
  }

  const upload = signedUploadResponseSchema.parse(data);
  return {
    attachment: {
      byteSize: parsed.byteSize,
      fileName: parsed.fileName,
      id: attachmentId,
      mediaType,
      mimeType: parsed.mimeType,
    },
    begin,
    upload: {
      bucket,
      path: upload.path,
      token: upload.token,
    },
  };
}

export async function deliverPreparedSupportMedia(input: unknown) {
  const parsed = finalizedMediaUploadSchema.parse(input);
  assertAcceptedMedia(parsed.mimeType, parsed.byteSize);

  const { admin, organizationId } = await getSupportDeliveryContext();
  const expectedPrefix = `${organizationId}/${parsed.messageId}/${parsed.attachmentId}/`;
  if (!parsed.path.startsWith(expectedPrefix)) {
    await markPreparedMediaFailed(
      admin,
      organizationId,
      parsed.messageId,
      parsed.attemptId,
      "storage_path_invalid",
    );
    throw new Error("O upload do arquivo não pertence a este atendimento.");
  }

  const { data: downloaded, error: downloadError } = await admin.storage
    .from(bucket)
    .download(parsed.path);
  if (downloadError || !downloaded) {
    await markPreparedMediaFailed(
      admin,
      organizationId,
      parsed.messageId,
      parsed.attemptId,
      "storage_download_unavailable",
    );
    throw new Error("Não foi possível ler o arquivo enviado.");
  }

  const { error: insertError } = await admin
    .from("support_message_attachments")
    .upsert({
      available_at: new Date().toISOString(),
      byte_size: parsed.byteSize,
      file_name: parsed.fileName,
      id: parsed.attachmentId,
      media_type: parsed.mediaType,
      message_id: parsed.messageId,
      mime_type: parsed.mimeType,
      organization_id: organizationId,
      status: "available",
      storage_bucket: bucket,
      storage_object_path: parsed.path,
    }, { onConflict: "id" });
  if (insertError) {
    await admin.storage.from(bucket).remove([parsed.path]);
    await markPreparedMediaFailed(
      admin,
      organizationId,
      parsed.messageId,
      parsed.attemptId,
      "attachment_insert_failed",
    );
    throw new Error("Não foi possível registrar o arquivo.");
  }

  const bytes = Buffer.from(await downloaded.arrayBuffer());
  return deliverSupportMediaAttempt(
    admin,
    organizationId,
    {
      attemptId: parsed.attemptId,
      created: true,
      messageId: parsed.messageId,
      status: "sending",
    },
    {
      caption: parsed.caption || undefined,
      dataUrl: `data:${parsed.mimeType};base64,${bytes.toString("base64")}`,
      fileName: parsed.fileName,
      mediaType: parsed.mediaType,
      mimeType: parsed.mimeType,
      recipient: "",
      trackingId: parsed.messageId,
    },
  );
}

export async function failPreparedSupportMedia(input: unknown) {
  const parsed = failedMediaUploadSchema.parse(input);
  const { admin, organizationId } = await getSupportDeliveryContext();
  const expectedPrefix = `${organizationId}/${parsed.messageId}/${parsed.attachmentId}/`;
  if (parsed.path.startsWith(expectedPrefix)) {
    await admin.storage.from(bucket).remove([parsed.path]);
  }
  await markPreparedMediaFailed(
    admin,
    organizationId,
    parsed.messageId,
    parsed.attemptId,
    "storage_browser_upload_failed",
  );
  return { ok: true };
}

export async function sendSupportMedia(input: {
  caption: string;
  clientRequestId: string;
  conversationId: string;
  file: File;
  replyToMessageId?: string;
}) {
  const parsed = z.object({
    caption: z.string().trim().max(10_000),
    clientRequestId: z.string().uuid(),
    conversationId: z.string().uuid(),
    replyToMessageId: z.string().uuid().optional(),
  }).parse(input);
  const mediaType = assertAcceptedMedia(input.file.type, input.file.size);

  const { admin, organizationId, supabase } = await getSupportDeliveryContext();
  const content = parsed.caption || `Arquivo: ${input.file.name}`;
  const { data: begun, error: beginError } = await supabase.rpc(
    parsed.replyToMessageId
      ? "begin_support_message_reply"
      : "begin_support_message_send",
    {
      message_content: content,
      request_id: parsed.clientRequestId,
      target_conversation_id: parsed.conversationId,
      target_organization_id: organizationId,
      ...(parsed.replyToMessageId
        ? { target_reply_to_message_id: parsed.replyToMessageId }
        : {}),
    },
  );
  if (beginError) {
    throw new Error("Não foi possível preparar o envio do arquivo.");
  }

  const begin = supportMessageBeginResultSchema.parse(begun);
  if (!begin.created) {
    return {
      duplicate: true,
      messageId: begin.messageId,
      status: begin.status === "sending" ? "sending" : "sent",
    };
  }

  const attachmentId = crypto.randomUUID();
  const path = `${organizationId}/${begin.messageId}/${attachmentId}/${safeStorageName(input.file.name)}`;
  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(path, input.file, {
      contentType: input.file.type,
      upsert: false,
    });
  if (uploadError) throw new Error("Não foi possível guardar o arquivo.");

  const { error: insertError } = await admin
    .from("support_message_attachments")
    .insert({
      available_at: new Date().toISOString(),
      byte_size: input.file.size,
      file_name: input.file.name,
      id: attachmentId,
      media_type: mediaType,
      message_id: begin.messageId,
      mime_type: input.file.type,
      organization_id: organizationId,
      status: "available",
      storage_object_path: path,
    });
  if (insertError) {
    await admin.storage.from(bucket).remove([path]);
    throw new Error("Não foi possível registrar o arquivo.");
  }

  const bytes = Buffer.from(await input.file.arrayBuffer());
  return deliverSupportMediaAttempt(admin, organizationId, begin, {
    caption: parsed.caption || undefined,
    dataUrl: `data:${input.file.type};base64,${bytes.toString("base64")}`,
    fileName: input.file.name,
    mediaType,
    mimeType: input.file.type,
    recipient: "",
    trackingId: begin.messageId,
  });
}

function assertAcceptedMedia(mimeType: string, byteSize: number) {
  if (!byteSize || byteSize > maxSize) {
    throw new Error("O arquivo deve ter até 25 MB.");
  }
  const mediaType = acceptedTypes.get(mimeType);
  if (!mediaType) throw new Error("Formato de arquivo não suportado.");
  return mediaType;
}

function safeStorageName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "arquivo";
}

async function markPreparedMediaFailed(
  admin: Awaited<ReturnType<typeof getSupportDeliveryContext>>["admin"],
  organizationId: string,
  messageId: string,
  attemptId: string,
  errorCode: string,
) {
  await admin.rpc("finalize_support_message_send_attempt", {
    delivery_metadata: {
      errorCode,
      failedAt: new Date().toISOString(),
    },
    delivery_status: "failed",
    provider_message_id: "",
    target_attempt_id: attemptId,
    target_message_id: messageId,
    target_organization_id: organizationId,
  });
}
