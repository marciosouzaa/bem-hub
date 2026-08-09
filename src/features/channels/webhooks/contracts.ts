import { z } from "zod";

export const channelSenderIdentityTypeSchema = z.enum([
  "phone",
  "wa_id",
  "remote_jid",
  "lid",
]);

export const channelMediaTypeSchema = z.enum([
  "audio",
  "document",
  "image",
  "video",
]);

/**
 * `downloadContext` never reaches a browser or the database. It is a
 * provider-authenticated message envelope used only by the server adapter when
 * the webhook itself does not include binary media.
 */
export const channelInboundMediaSchema = z.object({
  dataBase64: z.string().trim().min(1).optional(),
  downloadContext: z.unknown().optional(),
  fileName: z.string().trim().min(1).max(255).nullable(),
  mediaType: channelMediaTypeSchema,
  mimeType: z.string().trim().min(3).max(200),
}).refine(
  (value) => Boolean(value.dataBase64 || value.downloadContext),
  "Mídia recebida sem conteúdo para download.",
);

export const channelInboundMessageEventSchema = z.object({
  occurredAt: z.string().datetime(),
  providerMessageId: z.string().trim().min(1).max(300),
  senderIdentityType: channelSenderIdentityTypeSchema,
  senderIdentityValue: z.string().trim().min(3).max(300),
  senderName: z.string().trim().min(1).max(200).nullable(),
  senderPhone: z.string().regex(/^\+\d{8,15}$/).nullable(),
  text: z.string().trim().min(1).max(10_000),
  media: channelInboundMediaSchema.optional(),
  type: z.literal("message.received"),
});

export const channelPhoneMessageEventSchema = channelInboundMessageEventSchema.extend({
  type: z.literal("message.sent_by_phone"),
});

export const channelDeliveryStatusSchema = z.enum([
  "sent",
  "delivered",
  "read",
  "failed",
]);

export const channelMessageDeliveryEventSchema = z.object({
  deliveryStatus: channelDeliveryStatusSchema,
  eventId: z.string().trim().min(1).max(400),
  occurredAt: z.string().datetime(),
  providerMessageId: z.string().trim().min(1).max(300),
  type: z.literal("message.delivery_updated"),
});

export const channelMessageEventSchema = z.discriminatedUnion("type", [
  channelInboundMessageEventSchema,
  channelPhoneMessageEventSchema,
  channelMessageDeliveryEventSchema,
]);

export type ChannelMessageEvent = z.infer<typeof channelMessageEventSchema>;

export type ChannelWebhookRequest = {
  expectedInstanceId: string | null;
  headers: Headers;
  payload: unknown;
  rawBody: string;
};

export type ChannelWebhookConfiguration = {
  url: string;
};

export class ChannelWebhookVerificationError extends Error {
  constructor(message = "Webhook do provedor não autenticado.") {
    super(message);
    this.name = "ChannelWebhookVerificationError";
  }
}
