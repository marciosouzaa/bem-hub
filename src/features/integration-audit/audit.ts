import { z } from "zod";

export const integrationAuditSchema = z.object({
  platform: z.string().trim().min(2).max(100),
  apiAccess: z.enum(["yes", "no", "unknown"]),
  inventorySource: z.string().trim().min(2).max(120),
  ordersSource: z.string().trim().min(2).max(120),
  customersSource: z.string().trim().min(2).max(120),
  notes: z.string().trim().max(1000),
});

export type IntegrationAudit = z.infer<typeof integrationAuditSchema>;

export function parseIntegrationAudit(value: unknown) {
  return integrationAuditSchema.safeParse(value);
}
