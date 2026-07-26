"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRequiredWorkspace } from "@/features/organizations/queries";
import {
  supportOperationInputSchema,
  type SupportOperationInput,
} from "@/features/support/support-operation-schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SupportOperationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function manageSupportConversationAction(
  input: SupportOperationInput,
): Promise<SupportOperationResult> {
  const parsed = supportOperationInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Ação de atendimento inválida." };
  }

  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("manage_support_conversation", {
    expected_version: parsed.data.expectedVersion,
    operation: parsed.data.operation,
    target_conversation_id: parsed.data.conversationId,
    target_organization_id: workspace.organization.id,
    target_priority: parsed.data.priority,
    target_user_id: parsed.data.userId,
  });

  if (error) {
    return { ok: false, message: getSupportOperationError(error) };
  }

  revalidatePath("/app/support");
  revalidatePath(`/app/support/${parsed.data.conversationId}`);
  return {
    ok: true,
    message: getSupportOperationSuccess(parsed.data.operation),
  };
}

export async function markSupportConversationReadAction(
  conversationId: string,
) {
  const id = z.string().uuid().safeParse(conversationId);
  if (!id.success) return { ok: false as const };

  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("mark_support_conversation_read", {
    target_conversation_id: id.data,
    target_organization_id: workspace.organization.id,
  });

  if (error) return { ok: false as const };

  revalidatePath("/app/support");
  return { ok: true as const };
}

function getSupportOperationError(error: { code?: string; message: string }) {
  if (error.code === "40001") {
    return "Atendimento alterado por outra pessoa. Estado atualizado.";
  }
  if (error.code === "42501") {
    return "Você não pode alterar este atendimento.";
  }
  if (error.code === "P0002") {
    return "Atendimento ou responsável não encontrado.";
  }
  if (error.message.includes("support_assignment_required")) {
    return "Assuma o atendimento antes de alterar seu estado.";
  }
  if (error.message.includes("support_conversation_already_assigned")) {
    return "Atendimento já assumido por outra pessoa.";
  }
  if (error.message.includes("support_conversation_resolved")) {
    return "Reabra o atendimento antes de fazer esta alteração.";
  }
  if (error.code === "55000") {
    return "Transição não permitida para o estado atual.";
  }
  return "Não foi possível atualizar o atendimento.";
}

function getSupportOperationSuccess(
  operation: SupportOperationInput["operation"],
) {
  const messages: Record<SupportOperationInput["operation"], string> = {
    assign: "Responsável atualizado.",
    escalate: "Atendimento escalado.",
    open: "Atendimento reaberto.",
    pending: "Atendimento marcado como pendente.",
    release: "Atendimento devolvido à fila.",
    reopen: "Atendimento reaberto.",
    resolve: "Atendimento resolvido.",
    set_priority: "Prioridade atualizada.",
    take: "Atendimento assumido.",
  };

  return messages[operation];
}
