import { z } from "zod";

import { normalizeContactPhone } from "@/features/contacts/phone-normalization";

export const contactLifecycleStageSchema = z.enum([
  "new",
  "lead",
  "customer",
  "discarded",
]);

export const contactPhoneStatusSchema = z.enum([
  "supported",
  "unsupported_country",
  "invalid",
]);

export const contactPhoneReasonSchema = z.enum([
  "brazilian_landline",
  "brazilian_mobile",
  "country_not_supported",
  "invalid_area_code",
  "invalid_brazilian_number",
  "invalid_length",
  "legacy_mobile_ninth_digit_added",
  "missing_phone",
]);

export const contactFormSchema = z.object({
  email: z.union([
    z.literal(""),
    z.string().trim().email("Informe um e-mail válido.").max(320),
  ]),
  lifecycleStage: contactLifecycleStageSchema,
  name: z.string().trim().max(200, "Use no máximo 200 caracteres."),
  phone: z.string().trim().max(30, "Use no máximo 30 caracteres."),
  tags: z.string().trim().max(360, "Reduza a quantidade de etiquetas."),
}).superRefine((values, context) => {
  if (!values.name && !values.phone && !values.email) {
    context.addIssue({
      code: "custom",
      message: "Informe nome, telefone ou e-mail.",
      path: ["name"],
    });
  }

  if (values.phone && normalizeContactPhone(values.phone).status === "invalid") {
    context.addIssue({
      code: "custom",
      message: "Informe um telefone brasileiro válido ou outro DDI com +.",
      path: ["phone"],
    });
  }
});

export const contactSchema = z.object({
  channelNames: z.array(z.string()),
  conversationCount: z.number().int().nonnegative(),
  email: z.string().nullable(),
  id: z.string().uuid(),
  lastContactAt: z.string().nullable(),
  lastConversationId: z.string().uuid().nullable(),
  lifecycleStage: contactLifecycleStageSchema,
  name: z.string().nullable(),
  phone: z.string().nullable(),
  phoneCountryCode: z.string().nullable(),
  phoneReason: contactPhoneReasonSchema.nullable(),
  phoneStatus: contactPhoneStatusSchema,
  tags: z.array(z.string()),
  updatedAt: z.string(),
});

export type Contact = z.infer<typeof contactSchema>;
export type ContactFormValues = z.infer<typeof contactFormSchema>;
export type ContactLifecycleStage = z.infer<typeof contactLifecycleStageSchema>;
