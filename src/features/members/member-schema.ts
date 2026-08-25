import { z } from "zod";

export const memberRoleSchema = z.enum(["admin", "member"]);

export const memberInviteSchema = z.object({
  email: z.string().trim().email("Informe um e-mail valido."),
  name: z.string().trim().max(80, "Use ate 80 caracteres.").optional(),
  role: memberRoleSchema,
});

export const memberRoleFormSchema = z.object({
  role: memberRoleSchema,
});

export type MemberInviteValues = z.infer<typeof memberInviteSchema>;
export type MemberRoleFormValues = z.infer<typeof memberRoleFormSchema>;
