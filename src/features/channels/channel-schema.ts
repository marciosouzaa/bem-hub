import { z } from "zod";

import { channelProviderStatusSchema } from "@/features/channels/channel-provider-schema";

export const channelKindSchema = z.enum(["official", "unofficial"]);
export const channelAuthMethodSchema = z.enum(["qr", "pin"]);
export const channelStatusSchema = z
  .union([channelProviderStatusSchema, z.enum(["active", "pending"])])
  .transform((status) => status === "active" ? "connected" : status === "pending" ? "draft" : status);

export const channelFormSchema = z.object({
  authMethod: channelAuthMethodSchema,
  kind: channelKindSchema,
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").max(100),
  phone: z.string().trim().min(10, "Informe um número válido com DDD.").max(24),
});

export const channelConnectionSchema = z.object({
  authMethod: channelAuthMethodSchema,
  credentialUpdatedAt: z.string().nullable().default(null),
  externalInstanceId: z.string().nullable().default(null),
  hasCredentials: z.boolean().default(false),
  id: z.string().uuid(),
  kind: channelKindSchema,
  lastConnectedAt: z.string().nullable().default(null),
  lastHealthAt: z.string().nullable().default(null),
  name: z.string(),
  phoneNumber: z.string(),
  provider: z.string(),
  providerBaseUrl: z.string().nullable().default(null),
  status: channelStatusSchema,
  statusReason: z.string().nullable().default(null),
  webhookConfiguredAt: z.string().nullable().default(null),
  webhookVerifiedAt: z.string().nullable().default(null),
});

export type ChannelConnection = z.infer<typeof channelConnectionSchema>;
export type ChannelFormValues = z.infer<typeof channelFormSchema>;
