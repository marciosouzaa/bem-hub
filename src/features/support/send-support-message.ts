import "server-only";

import { z } from "zod";

import {
  directSupportMessageSchema,
  type DirectSupportMessageResult,
  retrySupportMessageSchema,
} from "@/features/support/support-message-contracts";
import {
  deliverSupportMessageAttempt,
  getSupportDeliveryContext,
  SupportMessageSendError,
  supportMessageBeginResultSchema,
} from "@/features/support/support-message-delivery";

export async function sendSupportMessage(
  rawInput: z.infer<typeof directSupportMessageSchema>,
): Promise<DirectSupportMessageResult> {
  const input = directSupportMessageSchema.parse(rawInput);
  const { admin, organizationId, supabase } =
    await getSupportDeliveryContext();
  const { data: begun, error: beginError } = await supabase.rpc(
    "begin_support_message_send",
    {
      message_content: input.content,
      request_id: input.clientRequestId,
      target_conversation_id: input.conversationId,
      target_organization_id: organizationId,
    },
  );

  if (beginError) throw mapBeginError(beginError);
  return deliverSupportMessageAttempt(
    admin,
    organizationId,
    supportMessageBeginResultSchema.parse(begun),
  );
}

export async function retrySupportMessage(
  rawInput: z.infer<typeof retrySupportMessageSchema>,
): Promise<DirectSupportMessageResult> {
  const input = retrySupportMessageSchema.parse(rawInput);
  const { admin, organizationId, supabase } =
    await getSupportDeliveryContext();
  const { data: begun, error: beginError } = await supabase.rpc(
    "begin_support_message_retry",
    {
      request_id: input.clientRequestId,
      target_message_id: input.messageId,
      target_organization_id: organizationId,
    },
  );

  if (beginError) throw mapBeginError(beginError);
  return deliverSupportMessageAttempt(
    admin,
    organizationId,
    supportMessageBeginResultSchema.parse(begun),
  );
}

function mapBeginError(error: { code?: string; message: string }) {
  if (error.code === "P0002") {
    return new SupportMessageSendError(
      "Atendimento não encontrado ou já resolvido.",
      404,
    );
  }
  if (error.code === "42501") {
    return new SupportMessageSendError("Sem acesso a este atendimento.", 403);
  }
  if (
    error.code === "55000"
    && error.message.includes("support_assignment_required")
  ) {
    return new SupportMessageSendError(
      "Assuma o atendimento antes de enviar ou tentar novamente.",
      409,
    );
  }
  if (error.code === "55000") {
    return new SupportMessageSendError(
      "Esta mensagem não pode ser reenviada no estado atual.",
      409,
    );
  }
  if (error.code === "22023") {
    return new SupportMessageSendError("Mensagem inválida.", 400);
  }
  return new SupportMessageSendError(
    "Não foi possível registrar a mensagem.",
    500,
  );
}
