"use server";

import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PasswordActionState = {
  ok: boolean;
  message: string | null;
  fieldErrors?: {
    password?: string[];
  };
};

const passwordSchema = z.object({
  password: z.string().min(8, "Use pelo menos 8 caracteres."),
});

export async function updateInvitationPasswordAction(
  _state: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: "Revise a senha informada.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      ok: false,
      message: "Nao foi possivel definir a senha agora.",
    };
  }

  return { ok: true, message: "Senha definida." };
}
