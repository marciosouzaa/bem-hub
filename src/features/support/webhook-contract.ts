import { z } from "zod";
export const verifiedInboundEventSchema=z.object({connectionId:z.string().uuid(),providerMessageId:z.string().trim().min(1).max(200),senderId:z.string().trim().min(1).max(200),senderPhone:z.string().trim().min(10).max(24),senderName:z.string().trim().max(200).nullable(),text:z.string().trim().min(1).max(8000),receivedAt:z.string().datetime()});
export type VerifiedInboundEvent=z.infer<typeof verifiedInboundEventSchema>;
export function inboundIdempotencyKey(event:VerifiedInboundEvent){return `${event.connectionId}:${event.providerMessageId}`}
export interface SupportChannelAdapter{verifyAndNormalize(request:Request):Promise<VerifiedInboundEvent>;sendApprovedMessage(input:{connectionId:string;recipientId:string;text:string;idempotencyKey:string}):Promise<{providerMessageId:string}>}
