import { z } from "zod";

export const assistantSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().nullable(),
  area: z.string().nullable(),
  instructions: z.string().min(10),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.4),
  isDefault: z.boolean().default(false),
});

export type Assistant = z.infer<typeof assistantSchema>;
