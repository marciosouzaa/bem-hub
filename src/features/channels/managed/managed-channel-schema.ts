import { z } from "zod";

export const managedChannelInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres.")
    .max(100, "Use no máximo 100 caracteres."),
  requestId: z.string().uuid(),
});

export const managedChannelRegistrationSchema = z.object({
  channelId: z.string().uuid(),
  created: z.boolean(),
  runId: z.string().uuid(),
  runStatus: z.enum([
    "queued",
    "in_progress",
    "awaiting_pairing",
    "succeeded",
    "failed",
  ]),
});

export type ManagedChannelInput = z.infer<typeof managedChannelInputSchema>;
