import { z } from "zod";

const externalId = z.string().trim().min(1).max(200);
export const commerceProductSchema = z.object({
  externalId, sku: z.string().trim().min(1).max(120), name: z.string().trim().min(1).max(240),
  priceCents: z.number().int().nonnegative(), stockQuantity: z.number().int().nonnegative(), active: z.boolean().default(true),
});
export const commerceCustomerSchema = z.object({
  externalId, name: z.string().trim().min(1).max(200), email: z.string().trim().email().nullable(), phone: z.string().trim().max(40).nullable(),
});
export const commerceOrderSchema = z.object({
  externalId, customerExternalId: externalId.nullable(), orderedAt: z.string().datetime(), totalCents: z.number().int().nonnegative(), status: z.string().trim().min(1).max(80),
});

export type CommerceProduct = z.infer<typeof commerceProductSchema>;
export type CommerceCustomer = z.infer<typeof commerceCustomerSchema>;
export type CommerceOrder = z.infer<typeof commerceOrderSchema>;
