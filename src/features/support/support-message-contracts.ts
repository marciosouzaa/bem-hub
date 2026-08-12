import { z } from "zod";

export const directSupportMessageSchema = z.object({
  clientRequestId: z.string().uuid(),
  content: z.string().trim().min(1).max(10_000),
  conversationId: z.string().uuid(),
  replyToMessageId: z.string().uuid().optional(),
});

export const retrySupportMessageSchema = z.object({
  clientRequestId: z.string().uuid(),
  messageId: z.string().uuid(),
});

export const supportMessageRequestSchema = z.discriminatedUnion("action", [
  directSupportMessageSchema.extend({ action: z.literal("send") }),
  retrySupportMessageSchema.extend({ action: z.literal("retry") }),
]);

export type DirectSupportMessageResult = {
  duplicate: boolean;
  messageId: string;
  status: "sending" | "sent";
};
