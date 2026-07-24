"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  contactFormSchema,
  type ContactFormValues,
} from "@/features/contacts/contact-schema";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ContactMutationResult =
  | { ok: true; message: string }
  | {
      ok: false;
      errors?: Partial<Record<keyof ContactFormValues, string[]>>;
      message: string;
    };

export async function createContactAction(input: unknown): Promise<ContactMutationResult> {
  return saveContact(null, input);
}

export async function updateContactAction(
  contactId: string,
  input: unknown,
): Promise<ContactMutationResult> {
  const id = z.string().uuid().safeParse(contactId);
  if (!id.success) return { ok: false, message: "Contato inválido." };
  return saveContact(id.data, input);
}

export async function archiveContactAction(contactId: string): Promise<ContactMutationResult> {
  const id = z.string().uuid().safeParse(contactId);
  if (!id.success) return { ok: false, message: "Contato inválido." };

  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("archive_contact", {
    target_contact_id: id.data,
    target_organization_id: workspace.organization.id,
  });

  if (error) {
    return { ok: false, message: "Não foi possível arquivar o contato." };
  }

  revalidateContacts();
  return { ok: true, message: "Contato arquivado. Histórico preservado." };
}

async function saveContact(
  contactId: string | null,
  input: unknown,
): Promise<ContactMutationResult> {
  const parsed = contactFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "Revise os dados informados.",
    };
  }

  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_contact", {
    contact_email: parsed.data.email,
    contact_lifecycle_stage: parsed.data.lifecycleStage,
    contact_name: parsed.data.name,
    contact_phone: parsed.data.phone,
    contact_tags: parseTags(parsed.data.tags),
    target_contact_id: contactId,
    target_organization_id: workspace.organization.id,
  });

  if (error) {
    const duplicate = error.code === "23505"
      || error.message.includes("contact_phone_exists");
    return {
      ok: false,
      message: duplicate
        ? "Já existe um contato com este telefone."
        : "Não foi possível salvar o contato.",
    };
  }

  revalidateContacts();
  return {
    ok: true,
    message: contactId ? "Contato atualizado." : "Contato cadastrado.",
  };
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function revalidateContacts() {
  revalidatePath("/app/contacts");
  revalidatePath("/app/support");
}
