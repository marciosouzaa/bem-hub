import { z } from "zod";

export const channelSenderIdentityTypeSchema = z.enum([
  "phone",
  "wa_id",
  "remote_jid",
  "lid",
]);

export const channelInboundMessageEventSchema = z.object({
  occurredAt: z.string().datetime(),
  providerMessageId: z.string().trim().min(1).max(300),
  senderIdentityType: channelSenderIdentityTypeSchema,
  senderIdentityValue: z.string().trim().min(3).max(300),
  senderName: z.string().trim().min(1).max(200).nullable(),
  senderPhone: z.string().regex(/^\+\d{8,15}$/).nullable(),
  text: z.string().trim().min(1).max(10_000),
  type: z.literal("message.received"),
});

export const channelPhoneMessageEventSchema = channelInboundMessageEventSchema.extend({
  type: z.literal("message.sent_by_phone"),
});

export const channelMessageEventSchema = z.discriminatedUnion("type", [
  channelInboundMessageEventSchema,
  channelPhoneMessageEventSchema,
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
