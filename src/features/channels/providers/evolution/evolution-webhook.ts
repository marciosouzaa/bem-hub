import { createHmac, timingSafeEqual } from "crypto";

import {
  channelMessageEventSchema,
  ChannelWebhookVerificationError,
  type ChannelMessageEvent,
  type ChannelWebhookRequest,
} from "@/features/channels/webhooks/contracts";

type UnknownRecord = Record<string, unknown>;

export function verifyAndNormalizeEvolutionWebhook(
  input: ChannelWebhookRequest,
  apiKey: string,
  instanceName: string,
): ChannelMessageEvent[] {
  if (!isRecord(input.payload)) return [];
  const payload = input.payload;

  const callbackSecret = input.headers.get("x-bem-hub-webhook-key")?.trim();
  const webhookSecret = createEvolutionWebhookSecret(apiKey, instanceName);
  if (!callbackSecret || !safeEqual(callbackSecret, webhookSecret)) {
    throw new ChannelWebhookVerificationError();
  }

  const payloadInstance = firstString(payload, ["instance"]);
  const expectedInstance = input.expectedInstanceId ?? instanceName;
  if (!payloadInstance || payloadInstance !== expectedInstance) {
    throw new ChannelWebhookVerificationError("Instância do webhook não confere.");
  }

  const eventType = (firstString(payload, ["event"]) ?? "").toLowerCase();
  const candidates = collectCandidates(payload.data);

  if (eventType === "messages.update") {
    return candidates
      .map((message) => normalizeDeliveryUpdate(message, payload))
      .filter((event): event is ChannelMessageEvent => event !== null);
  }
  if (eventType !== "messages.upsert") return [];

  return candidates
    .map(normalizeMessage)
    .filter((event): event is ChannelMessageEvent => event !== null);
}

export function createEvolutionWebhookSecret(
  apiKey: string,
  instanceName: string,
) {
  return createHmac("sha256", apiKey)
    .update(`bem-hub:channel-webhook:${instanceName}`, "utf8")
    .digest("hex");
}

function normalizeDeliveryUpdate(
  message: UnknownRecord,
  payload: UnknownRecord,
): ChannelMessageEvent | null {
  const providerMessageId = firstString(message, ["keyId", "key.id", "id"]);
  const deliveryStatus = normalizeDeliveryStatus(
    firstValue(message, ["status", "update.status"]),
  );
  if (!providerMessageId || !deliveryStatus) return null;

  return channelMessageEventSchema.parse({
    deliveryStatus,
    eventId: `${providerMessageId}:${deliveryStatus}`,
    occurredAt: normalizeTimestamp(
      firstValue(message, ["messageTimestamp", "timestamp"])
        ?? firstValue(payload, ["date_time"]),
    ),
    providerMessageId,
    type: "message.delivery_updated",
  });
}

function normalizeDeliveryStatus(value: unknown) {
  if (typeof value === "number") {
    if (value >= 4) return "read" as const;
    if (value === 3) return "delivered" as const;
    if (value >= 1) return "sent" as const;
    return null;
  }
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (["error", "failed"].includes(normalized)) return "failed" as const;
  if (["pending", "server_ack", "sent"].includes(normalized)) return "sent" as const;
  if (["delivery_ack", "delivered"].includes(normalized)) return "delivered" as const;
  if (["played", "read"].includes(normalized)) return "read" as const;
  return null;
}

function normalizeMessage(message: UnknownRecord): ChannelMessageEvent | null {
  const chatId = firstString(message, ["key.remoteJidAlt", "key.remoteJid"]);
  const fromMe = firstBoolean(message, ["key.fromMe"]) ?? false;
  if (
    !chatId
    || chatId.endsWith("@g.us")
    || chatId.endsWith("@newsletter")
    || chatId === "status@broadcast"
  ) {
    return null;
  }

  const providerMessageId = firstString(message, ["key.id", "keyId", "id"]);
  const content = firstRecord(message, ["message"]);
  if (!content || isProtocolOnlyMessage(content)) return null;
  const replyToProviderMessageId = findQuotedProviderMessageId(message);
  const media = extractEvolutionMedia(message);
  const text = firstString(message, [
    "message.conversation",
    "message.extendedTextMessage.text",
    "message.text",
  ]) ?? media?.caption ?? (media ? "Mídia recebida" : null);
  if (!providerMessageId || !text) return null;

  const participant = firstString(message, [
    "key.participantAlt",
    "key.participant",
  ]);
  const identitySource = fromMe ? chatId : participant ?? chatId;
  const identity = normalizeIdentity(identitySource);
  if (identity.type === "remote_jid") return null;

  return channelMessageEventSchema.parse({
    occurredAt: normalizeTimestamp(
      firstValue(message, ["messageTimestamp", "timestamp"]),
    ),
    providerMessageId,
    senderIdentityType: identity.type,
    senderIdentityValue: identity.value,
    senderName: fromMe ? null : firstString(message, ["pushName"]),
    senderPhone: normalizePhone(identitySource),
    text,
    ...(replyToProviderMessageId ? { replyToProviderMessageId } : {}),
    ...(media ? { media: { ...media, downloadContext: message } } : {}),
    type: fromMe ? "message.sent_by_phone" : "message.received",
  });
}

function isProtocolOnlyMessage(message: UnknownRecord) {
  return firstRecord(message, ["protocolMessage", "ProtocolMessage"]) !== null;
}

function findQuotedProviderMessageId(record: UnknownRecord, depth = 0): string | null {
  if (depth > 5) return null;
  const context = firstRecord(record, ["contextInfo", "ContextInfo"]);
  const reference = context
    ? firstString(context, ["stanzaId", "StanzaId", "stanzaID", "StanzaID"])
    : null;
  if (reference) return reference;

  for (const value of Object.values(record)) {
    if (!isRecord(value)) continue;
    const nestedReference = findQuotedProviderMessageId(value, depth + 1);
    if (nestedReference) return nestedReference;
  }
  return null;
}

function extractEvolutionMedia(message: UnknownRecord): {
  caption: string | null;
  fileName: string | null;
  mediaType: "audio" | "document" | "image" | "video";
  mimeType: string;
} | null {
  const content = firstRecord(message, ["message"]);
  if (!content) return null;
  const candidates: Array<{
    key: string;
    mediaType: "audio" | "document" | "image" | "video";
    fallbackMimeType: string;
  }> = [
    { key: "imageMessage", mediaType: "image", fallbackMimeType: "image/jpeg" },
    { key: "videoMessage", mediaType: "video", fallbackMimeType: "video/mp4" },
    { key: "audioMessage", mediaType: "audio", fallbackMimeType: "audio/ogg" },
    { key: "documentMessage", mediaType: "document", fallbackMimeType: "application/octet-stream" },
  ];
  for (const candidate of candidates) {
    const media = firstRecord(content, [candidate.key]);
    if (!media) continue;
    return {
      caption: firstString(media, ["caption"]),
      fileName: firstString(media, ["fileName", "file_name"]),
      mediaType: candidate.mediaType,
      mimeType: firstString(media, ["mimetype", "mimeType"]) ?? candidate.fallbackMimeType,
    };
  }
  return null;
}

function collectCandidates(value: unknown) {
  if (Array.isArray(value)) return value.filter(isRecord);
  return isRecord(value) ? [value] : [];
}

function normalizeIdentity(value: string): {
  type: "lid" | "phone" | "remote_jid";
  value: string;
} {
  const normalized = value.trim().toLowerCase();
  if (normalized.endsWith("@lid")) return { type: "lid", value: normalized };
  if (normalized.endsWith("@s.whatsapp.net") || /^\+?\d+$/.test(normalized)) {
    return { type: "phone", value: normalized.replace(/\D/g, "") };
  }
  return { type: "remote_jid", value: normalized };
}

function normalizePhone(value: string) {
  if (value.toLowerCase().endsWith("@lid")) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === "string" && !/^\d+$/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  const numeric = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : null;
  if (!numeric || !Number.isFinite(numeric)) return new Date().toISOString();
  const date = new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function firstString(record: UnknownRecord, paths: string[]) {
  for (const path of paths) {
    const value = readPath(record, path);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstRecord(record: UnknownRecord, paths: string[]) {
  for (const path of paths) {
    const value = readPath(record, path);
    if (isRecord(value)) return value;
  }
  return null;
}

function firstBoolean(record: UnknownRecord, paths: string[]) {
  for (const path of paths) {
    const value = readPath(record, path);
    if (typeof value === "boolean") return value;
  }
  return null;
}

function firstValue(record: UnknownRecord, paths: string[]) {
  for (const path of paths) {
    const value = readPath(record, path);
    if (value !== undefined && value !== null) return value;
  }
  return null;
}

function readPath(record: UnknownRecord, path: string) {
  let current: unknown = record;
  for (const segment of path.split(".")) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length
    && timingSafeEqual(leftBuffer, rightBuffer);
}
