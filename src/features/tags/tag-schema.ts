import { z } from "zod";

export const tagHexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor hexadecimal como #4EE3A3.");

export const tagFormSchema = z.object({
  description: z.string().trim().max(500, "Use no máximo 500 caracteres."),
  hexColor: tagHexColorSchema,
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da etiqueta.")
    .max(60, "Use no máximo 60 caracteres."),
});

export const tagReferenceSchema = z.object({
  hexColor: tagHexColorSchema,
  id: z.string().uuid(),
  name: z.string(),
});

export const tagSchema = tagReferenceSchema.extend({
  description: z.string().nullable(),
  updatedAt: z.string(),
  usageCount: z.number().int().nonnegative(),
});

export type Tag = z.infer<typeof tagSchema>;
export type TagFormValues = z.infer<typeof tagFormSchema>;
export type TagReference = z.infer<typeof tagReferenceSchema>;
