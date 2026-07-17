import { createHash, randomBytes } from "crypto";
import { z } from "zod";

export const webhookEndpointTokenSchema = z
  .string()
  .trim()
  .min(40)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);

export function createWebhookEndpointToken() {
  return randomBytes(32).toString("base64url");
}

export function hashWebhookEndpointToken(token: string) {
  return createHash("sha256")
    .update(webhookEndpointTokenSchema.parse(token))
    .digest("hex");
}

export function hashWebhookPayload(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("hex");
}

