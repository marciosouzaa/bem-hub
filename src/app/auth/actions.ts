"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getOrCreateWorkspace } from "@/features/organizations/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  message?: string;
  fieldErrors?: {
    name?: string[];
    organizationName?: string[];
    email?: string[];
    password?: string[];
  };
};

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail valido.").trim(),
  password: z.string().min(1, "Informe sua senha."),
});

const signupSchema = z.object({
  name: z.string().min(2, "Informe seu nome.").trim(),
  organizationName: z.string().min(2, "Informe o nome da empresa.").trim(),
  email: z.string().email("Informe um e-mail valido.").trim(),
  password: z.string().min(8, "Use pelo menos 8 caracteres."),
});

export async function login(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { message: "E-mail ou senha invalidos." };
  }

  redirect("/app");
}

export async function signup(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    organizationName: formData.get("organizationName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        name: parsed.data.name,
        organization_name: parsed.data.organizationName,
      },
    },
  });

  if (error) {
    return { message: error.message };
  }

  if (!data.user) {
    return { message: "Nao foi possivel criar o usuario." };
  }

  if (!data.session) {
    return {
      message:
        "Cadastro criado. Confirme seu e-mail e depois entre para criar o workspace.",
    };
  }

  try {
    await getOrCreateWorkspace(supabase, {
      user: data.user,
      organizationName: parsed.data.organizationName,
    });
  } catch (bootstrapError) {
    return {
      message:
        bootstrapError instanceof Error
          ? bootstrapError.message
          : "Usuario criado, mas o workspace nao foi configurado.",
    };
  }

  redirect("/app");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
