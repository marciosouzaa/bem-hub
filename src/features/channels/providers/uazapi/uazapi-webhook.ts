import { timingSafeEqual } from "crypto";

import {
  channelMessageEventSchema,
  ChannelWebhookVerificationError,
  type ChannelMessageEvent,
  type ChannelWebhookRequest,
} from "@/features/channels/webhooks/contracts";

type UnknownRecord = Record<string, unknown>;

export function verifyAndNormalizeUazapiWebhook(
  input: ChannelWebhookRequest,
  instanceToken: string,
): ChannelMessageEvent[] {
  if (!isRecord(input.payload)) return [];

  const callbackToken = readString(input.payload, "token");
  if (callbackToken && !safeEqual(callbackToken, instanceToken)) {
    throw new ChannelWebhookVerificationError();
  }

  const payloadInstance = readString(input.payload, "instance");
  if (
    payloadInstance
    && input.expectedInstanceId
    && payloadInstance !== input.expectedInstanceId
  ) {
    throw new ChannelWebhookVerificationError("Instância do webhook não confere.");
  }

  const eventType = (
    readString(input.payload, "event")
    ?? readString(input.payload, "EventType")
    ?? ""
  ).toLowerCase();
  if (eventType !== "messages" && eventType !== "message") return [];

  return collectMessageCandidates(input.payload)
    .map(normalizeMessage)
    .filter((event): event is ChannelMessageEvent => event !== null);
}

function normalizeMessage(message: UnknownRecord): ChannelMessageEvent | null {
  const chatId = firstString(message, ["chatid", "chatId", "key.remoteJid"]);
  const fromMe = firstBoolean(message, ["fromMe", "key.fromMe"]) ?? false;
  const isGroup = (
    firstBoolean(message, ["isGroup"])
    ?? chatId?.endsWith("@g.us")
    ?? false
  );
  const wasSentByApi = firstBoolean(message, ["wasSentByApi"]) ?? false;
  if (isGroup || wasSentByApi) return null;

  const providerMessageId = firstString(message, [
    "messageid",
    "messageId",
    "key.id",
    "id",
  ]);
  const text = extractText(message);
  if (!providerMessageId || !text) return null;

  const senderPn = firstString(message, ["sender_pn"]);
  const senderLid = firstString(message, ["sender_lid"]);
  const sender = firstString(message, ["sender", "key.participant"]);
  const identitySource = fromMe
    ? chatId
    : senderPn ?? senderLid ?? sender ?? chatId;
  if (!identitySource) return null;

  const identity = normalizeIdentity(identitySource);
  const phone = normalizePhone(fromMe ? chatId : senderPn ?? sender ?? chatId);

  return channelMessageEventSchema.parse({
    occurredAt: normalizeTimestamp(
      firstValue(message, ["messageTimestamp", "timestamp"]),
    ),
    providerMessageId,
    senderIdentityType: identity.type,
    senderIdentityValue: identity.value,
    senderName: fromMe
      ? null
      : firstString(message, ["senderName", "pushName"]),
    senderPhone: phone,
    text,
    type: fromMe ? "message.sent_by_phone" : "message.received",
  });
}

function collectMessageCandidates(payload: UnknownRecord) {
  const candidates: UnknownRecord[] = [];
  addCandidate(candidates, payload.message);
  addCandidate(candidates, payload.messages);
  addCandidate(candidates, payload.data);

  if (isRecord(payload.data)) {
    addCandidate(candidates, payload.data.message);
    addCandidate(candidates, payload.data.messages);
  }

  if (looksLikeMessage(payload)) candidates.push(payload);
  return candidates;
}

function addCandidate(target: UnknownRecord[], candidate: unknown) {
  if (Array.isArray(candidate)) {
    for (const item of candidate) {
      if (isRecord(item)) target.push(item);
    }
    return;
  }
  if (isRecord(candidate) && looksLikeMessage(candidate)) target.push(candidate);
}

function looksLikeMessage(value: UnknownRecord) {
  return Boolean(
    firstString(value, ["messageid", "messageId", "key.id", "id"])
    || firstString(value, ["text", "content", "message.conversation"]),
  );
}

function extractText(message: UnknownRecord) {
  return firstString(message, [
    "text",
    "content.text",
    "content.conversation",
    "content.extendedTextMessage.text",
    "message.conversation",
    "message.extendedTextMessage.text",
  ]);
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
      value: normalized.replace(/\D/g, ""),
    };
  }
  return { type: "remote_jid", value: normalized };
}

function normalizePhone(value: string | null) {
  if (!value || value.toLowerCase().endsWith("@lid")) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

function normalizeTimestamp(value: unknown) {
  const numeric = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : null;
  if (!numeric || !Number.isFinite(numeric)) return new Date().toISOString();
  const milliseconds = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function firstString(record: UnknownRecord, paths: string[]) {
  for (const path of paths) {
    const value = readPath(record, path);
    if (typeof value === "string" && value.trim()) return value.trim();
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

function readString(record: UnknownRecord, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length
    && timingSafeEqual(leftBuffer, rightBuffer)
  );
}
