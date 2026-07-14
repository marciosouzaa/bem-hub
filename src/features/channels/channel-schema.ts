import { z } from "zod";

export const channelKindSchema = z.enum(["official", "unofficial"]);
export const channelAuthMethodSchema = z.enum(["qr", "pin"]);
export const channelStatusSchema = z.enum(["pending", "active", "disabled", "failed"]);

export const channelFormSchema = z.object({
  authMethod: channelAuthMethodSchema,
  kind: channelKindSchema,
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").max(100),
  phone: z.string().trim().min(10, "Informe um número válido com DDD.").max(24),
});

export const channelConnectionSchema = z.object({
  authMethod: channelAuthMethodSchema,
  id: z.string().uuid(),
  kind: channelKindSchema,
  name: z.string(),
  phoneNumber: z.string(),
  provider: z.string(),
  status: channelStatusSchema,
});

export type ChannelConnection = z.infer<typeof channelConnectionSchema>;
export type ChannelFormValues = z.infer<typeof channelFormSchema>;
