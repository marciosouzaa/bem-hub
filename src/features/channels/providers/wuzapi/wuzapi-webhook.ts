import { createHmac, timingSafeEqual } from "crypto";

import {
  channelMessageEventSchema,
  ChannelWebhookVerificationError,
  type ChannelMessageEvent,
  type ChannelWebhookRequest,
} from "@/features/channels/webhooks/contracts";

type UnknownRecord = Record<string, unknown>;

export function verifyAndNormalizeWuzapiWebhook(
  input: ChannelWebhookRequest,
  hmacKey: string,
): ChannelMessageEvent[] {
  verifySignature(input, hmacKey);
  if (!isRecord(input.payload)) return [];

  const type = firstString(input.payload, ["type"]);
  if (type === "ReadReceipt") return normalizeReceipts(input.payload);
  if (type !== "Message") return [];

  const event = isRecord(input.payload.event) ? input.payload.event : null;
  return event ? normalizeMessage(event) : [];
}

function verifySignature(input: ChannelWebhookRequest, hmacKey: string) {
  const received = input.headers.get("x-hmac-signature")?.trim().toLowerCase();
  const expected = createHmac("sha256", hmacKey)
    .update(input.rawBody, "utf8")
    .digest("hex");
  if (!received || !safeEqual(received, expected)) {
    throw new ChannelWebhookVerificationError();
  }
}

function normalizeReceipts(payload: UnknownRecord): ChannelMessageEvent[] {
  const event = isRecord(payload.event) ? payload.event : {};
  const state = firstString(payload, ["state"])?.toLowerCase();
  const deliveryStatus = state === "delivered"
    ? "delivered"
    : state === "read" || state === "readself"
      ? "read"
      : null;
  if (!deliveryStatus) return [];

  const messageIds = firstStringArray(event, ["MessageIDs", "messageIDs"]);
  const occurredAt = normalizeTimestamp(
    firstValue(event, ["Timestamp", "timestamp"]),
  );
  return messageIds.map((providerMessageId) => channelMessageEventSchema.parse({
    deliveryStatus,
    eventId: `${providerMessageId}:${deliveryStatus}`,
    occurredAt,
    providerMessageId,
    type: "message.delivery_updated",
  }));
}

function normalizeMessage(event: UnknownRecord): ChannelMessageEvent[] {
  const info = firstRecord(event, ["Info", "info"]);
  if (!info) return [];

  const isGroup = firstBoolean(info, ["IsGroup", "isGroup"]) ?? false;
  const fromMe = firstBoolean(info, ["IsFromMe", "isFromMe"]) ?? false;
  if (isGroup) return [];

  const chatId = jidToString(firstValue(info, ["Chat", "chat"]));
  const senderId = jidToString(firstValue(info, ["Sender", "sender"]));
  const senderAlt = jidToString(firstValue(info, ["SenderAlt", "senderAlt"]));
  const recipientAlt = jidToString(
    firstValue(info, ["RecipientAlt", "recipientAlt"]),
  );
  const providerMessageId = firstString(info, ["ID", "id"]);
  const message = firstRecord(event, ["Message", "message"]);
  const text = message ? firstString(message, [
    "conversation",
    "Conversation",
    "extendedTextMessage.text",
    "ExtendedTextMessage.text",
    "extendedTextMessage.Text",
    "ExtendedTextMessage.Text",
  ]) : null;
  if (!chatId || !providerMessageId || !text) return [];

  const identitySource = fromMe
    ? preferPhoneIdentity(chatId, recipientAlt)
    : preferPhoneIdentity(senderId ?? chatId, senderAlt);
  const identity = normalizeIdentity(identitySource);
  return [channelMessageEventSchema.parse({
    occurredAt: normalizeTimestamp(
      firstValue(info, ["Timestamp", "timestamp"]),
    ),
    providerMessageId,
    senderIdentityType: identity.type,
    senderIdentityValue: identity.value,
    senderName: fromMe ? null : firstString(info, ["PushName", "pushName"]),
    senderPhone: normalizePhone(identitySource),
    text,
    type: fromMe ? "message.sent_by_phone" : "message.received",
  })];
}

function jidToString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!isRecord(value)) return null;

  const user = firstString(value, ["User", "user"]);
  const server = firstString(value, ["Server", "server"]);
  return user && server ? `${user}@${server}` : null;
}

function normalizeIdentity(value: string): {
  type: "lid" | "phone" | "remote_jid";
  value: string;
} {
  const normalized = value.trim().toLowerCase();
  if (normalized.endsWith("@lid")) return { type: "lid", value: normalized };
  if (normalized.endsWith("@s.whatsapp.net") || /^\+?\d+$/.test(normalized)) {
    return {
      type: "phone",
      value: normalizePhoneDigits(normalized) ?? normalized.replace(/\D/g, ""),
    };
  }
  return { type: "remote_jid", value: normalized };
}

function normalizePhone(value: string) {
  if (value.toLowerCase().endsWith("@lid")) return null;
  const digits = normalizePhoneDigits(value);
  if (!digits) return null;
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}

function preferPhoneIdentity(
  fallback: string,
  ...values: Array<string | null>
) {
  const available = [
    ...values.filter((value): value is string => value !== null),
    fallback,
  ];
  return available.find((value) => normalizePhoneDigits(value) !== null)
    ?? fallback;
}

function normalizePhoneDigits(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.endsWith("@lid")) return null;
  const localPart = normalized.split("@", 1)[0].split(":", 1)[0];
  const digits = localPart.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
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

function firstRecord(record: UnknownRecord, paths: string[]) {
  for (const path of paths) {
    const value = readPath(record, path);
    if (isRecord(value)) return value;
  }
  return null;
}

function firstString(record: UnknownRecord, paths: string[]) {
  for (const path of paths) {
    const value = readPath(record, path);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstStringArray(record: UnknownRecord, paths: string[]) {
  for (const path of paths) {
    const value = readPath(record, path);
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      );
    }
  }
  return [];
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
