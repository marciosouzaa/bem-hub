import { z } from "zod";

import type { ChannelConnection } from "@/features/channels/channel-schema";
import { normalizeContactPhone } from "@/features/contacts/phone-normalization";

export const supportConversationStartFormSchema = z.object({
  channelConnectionId: z.string().uuid("Escolha um canal conectado."),
  contactName: z.string().trim().max(200, "Use no máximo 200 caracteres."),
  contactPhone: z
    .string()
    .trim()
    .min(1, "Informe o telefone do contato.")
    .max(30, "Use no máximo 30 caracteres."),
  message: z
    .string()
    .trim()
    .min(1, "Escreva a primeira mensagem.")
    .max(10_000, "Use no máximo 10.000 caracteres."),
}).superRefine((values, context) => {
  if (normalizeContactPhone(values.contactPhone).status === "invalid") {
    context.addIssue({
      code: "custom",
      message: "Informe um telefone brasileiro válido ou outro DDI com +.",
      path: ["contactPhone"],
    });
  }
});

export const supportConversationStartRequestSchema =
  supportConversationStartFormSchema.extend({
    clientRequestId: z.string().uuid(),
  });

export type SupportConversationStartFormValues = z.infer<
  typeof supportConversationStartFormSchema
>;

export function canStartSupportConversation(
  channel: Pick<ChannelConnection, "hasCredentials" | "provider" | "status">,
) {
  return channel.status === "connected"
    && channel.hasCredentials
    && ["evolution", "uazapi", "wuzapi", "z_api"].includes(channel.provider);
}
