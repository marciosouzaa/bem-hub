import { z } from "zod";

export const supportPrioritySchema = z.enum([
  "low",
  "normal",
  "high",
  "urgent",
]);

export const supportOperationSchema = z.enum([
  "take",
  "assign",
  "release",
  "open",
  "pending",
  "escalate",
  "resolve",
  "reopen",
  "set_priority",
]);

export const supportOperationInputSchema = z.object({
  conversationId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  operation: supportOperationSchema,
  priority: supportPrioritySchema.nullable().default(null),
  userId: z.string().uuid().nullable().default(null),
}).superRefine((input, context) => {
  if (input.operation === "set_priority" && input.priority === null) {
    context.addIssue({
      code: "custom",
      message: "Informe a prioridade.",
      path: ["priority"],
    });
  }
});

export type SupportOperationInput = z.infer<
  typeof supportOperationInputSchema
>;

