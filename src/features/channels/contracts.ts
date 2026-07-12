import { z } from "zod";

export const inboundChannelMessageSchema = z.object({
  providerMessageId: z.string().min(1).max(200),
  channel: z.string().min(1).max(40),
  senderExternalId: z.string().min(1).max(200),
  text: z.string().trim().min(1).max(8_000),
  receivedAt: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const assistedReplyStatusSchema = z.enum(["draft", "approved", "rejected", "sent", "failed", "escalated"]);
export type AssistedReplyStatus = z.infer<typeof assistedReplyStatusSchema>;
const transitions: Record<AssistedReplyStatus, AssistedReplyStatus[]> = {
  draft: ["approved", "rejected", "escalated"], approved: ["sent", "failed", "escalated"],
  rejected: [], sent: [], failed: ["approved", "escalated"], escalated: [],
};
export function buildChannelIdempotencyKey(input: { channel: string; providerMessageId: string }) {
  return `${input.channel.trim().toLowerCase()}:${input.providerMessageId.trim()}`;
}
export function canTransitionAssistedReply(from: AssistedReplyStatus, to: AssistedReplyStatus) {
  return transitions[from].includes(to);
}
