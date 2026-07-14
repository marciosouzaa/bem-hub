import { z } from "zod";

import { isSupportedProvider } from "@/lib/ai/providers";

export const assistantEditorSchema = z.object({
  area: z.string().trim().max(60, "Use no máximo 60 caracteres.").transform((value) => value || null),
  description: z.string().trim().max(180, "Use no máximo 180 caracteres.").transform((value) => value || null),
  instructions: z.string().trim().min(10, "Descreva instruções com pelo menos 10 caracteres.").max(4_000, "Use no máximo 4000 caracteres."),
  isDefault: z.boolean(),
  model: z.string().trim().min(1, "Informe o modelo.").max(80, "Use no máximo 80 caracteres."),
  name: z.string().trim().min(2, "Informe pelo menos 2 caracteres.").max(80, "Use no máximo 80 caracteres."),
  provider: z.string().refine(isSupportedProvider, "Provedor inválido."),
  providerConnectionId: z.union([z.literal(""), z.string().uuid("Conexão de IA inválida.")]).transform((value) => value || null),
  temperature: z.number().min(0, "Use um valor entre 0 e 2.").max(2, "Use um valor entre 0 e 2."),
});

export type AssistantEditorInput = z.input<typeof assistantEditorSchema>;
export type AssistantEditorData = z.output<typeof assistantEditorSchema>;
