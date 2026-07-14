"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createDraftAction(conversationId: string, formData: FormData) {
  const content = z.string().trim().min(1).max(10_000).safeParse(formData.get("content"));
  if (!content.success) throw new Error("Rascunho inválido.");

  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_support_draft", {
    draft_content: content.data,
    target_conversation_id: conversationId,
    target_organization_id: workspace.organization.id,
  });
  if (error) throw new Error(`Falha ao criar rascunho: ${error.message}`);
  revalidatePath(`/app/support/${conversationId}`);
}

export async function reviewDraftAction(
  conversationId: string,
  messageId: string,
  decision: "approved" | "rejected" | "escalated",
) {
  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("review_support_draft", {
    review_decision: decision,
    target_message_id: messageId,
    target_organization_id: workspace.organization.id,
  });
  if (error) throw new Error(`Falha ao revisar rascunho: ${error.message}`);
  revalidatePath(`/app/support/${conversationId}`);
  revalidatePath("/app/support");
}

export async function updateDraftAction(conversationId: string, messageId: string, formData: FormData) {
  const content = z.string().trim().min(1).max(10_000).safeParse(formData.get("content"));
  if (!content.success) throw new Error("Rascunho inválido.");

  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_support_draft", {
    draft_content: content.data,
    target_message_id: messageId,
    target_organization_id: workspace.organization.id,
  });
  if (error) throw new Error(`Falha ao editar rascunho: ${error.message}`);
  revalidatePath(`/app/support/${conversationId}`);
}
