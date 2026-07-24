"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  tagFormSchema,
  type TagFormValues,
} from "@/features/tags/tag-schema";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TagMutationResult =
  | { ok: true; message: string }
  | {
      ok: false;
      errors?: Partial<Record<keyof TagFormValues, string[]>>;
      message: string;
    };

export async function createTagAction(input: unknown): Promise<TagMutationResult> {
  return saveTag(null, input);
}

export async function updateTagAction(
  tagId: string,
  input: unknown,
): Promise<TagMutationResult> {
  const id = z.string().uuid().safeParse(tagId);
  if (!id.success) return { ok: false, message: "Etiqueta inválida." };
  return saveTag(id.data, input);
}

export async function archiveTagAction(tagId: string): Promise<TagMutationResult> {
  const id = z.string().uuid().safeParse(tagId);
  if (!id.success) return { ok: false, message: "Etiqueta inválida." };

  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("archive_tag", {
    target_organization_id: workspace.organization.id,
    target_tag_id: id.data,
  });

  if (error) {
    const inUse = error.code === "23503" || error.message.includes("tag_in_use");
    return {
      ok: false,
      message: inUse
        ? "Remova esta etiqueta dos contatos antes de arquivá-la."
        : "Não foi possível arquivar a etiqueta.",
    };
  }

  revalidateTagPaths();
  return { ok: true, message: "Etiqueta arquivada." };
}

async function saveTag(
  tagId: string | null,
  input: unknown,
): Promise<TagMutationResult> {
  const parsed = tagFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "Revise os dados informados.",
    };
  }

  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_tag", {
    tag_description: parsed.data.description,
    tag_hex_color: parsed.data.hexColor.toUpperCase(),
    tag_name: parsed.data.name,
    target_organization_id: workspace.organization.id,
    target_tag_id: tagId,
  });

  if (error) {
    const duplicate = error.code === "23505"
      || error.message.includes("tag_name_exists");
    return {
      ok: false,
      message: duplicate
        ? "Já existe uma etiqueta com este nome."
        : "Não foi possível salvar a etiqueta.",
    };
  }

  revalidateTagPaths();
  return {
    ok: true,
    message: tagId ? "Etiqueta atualizada." : "Etiqueta criada.",
  };
}

function revalidateTagPaths() {
  revalidatePath("/app/tags");
  revalidatePath("/app/contacts");
  revalidatePath("/app/support");
}
