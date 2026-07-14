import { z } from "zod";

import { isSupportedProvider } from "@/lib/ai/providers";

export const aiProviderConnectionEditorSchema = z.object({
  apiKey: z.string().trim().min(8, "Informe uma chave válida."),
  availableModels: z.string().default(""),
  defaultModel: z.string().trim().max(120, "Use no máximo 120 caracteres.").transform((value) => value || null),
  isDefault: z.boolean(),
  name: z.string().trim().min(2, "Informe pelo menos 2 caracteres.").max(80, "Use no máximo 80 caracteres."),
  provider: z.string().refine(isSupportedProvider, "Provedor inválido."),
});

export type AiProviderConnectionEditorInput = z.input<typeof aiProviderConnectionEditorSchema>;
export type AiProviderConnectionEditorData = z.output<typeof aiProviderConnectionEditorSchema>;
