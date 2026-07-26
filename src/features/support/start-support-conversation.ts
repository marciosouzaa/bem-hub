import "server-only";

import { z } from "zod";

import {
  supportConversationStartRequestSchema,
} from "@/features/support/start-support-conversation-contracts";
import type { DirectSupportMessageResult } from "@/features/support/support-message-contracts";
import {
  deliverSupportMessageAttempt,
  getSupportDeliveryContext,
  SupportMessageSendError,
  supportMessageBeginResultSchema,
} from "@/features/support/support-message-delivery";

const startResultSchema = supportMessageBeginResultSchema.extend({
  channelConnectionId: z.string().uuid(),
  contactId: z.string().uuid(),
  conversationCreated: z.boolean(),
  conversationId: z.string().uuid(),
  provider: z.string().min(1),
});

export type SupportConversationStartResult = DirectSupportMessageResult & {
  conversationCreated: boolean;
  conversationId: string;
  provider: string;
};

export class SupportConversationStartError extends SupportMessageSendError {
  readonly conversationId: string | null;

  constructor(message: string, httpStatus: number, conversationId: string | null = null) {
    super(message, httpStatus);
    this.name = "SupportConversationStartError";
    this.conversationId = conversationId;
  }
}

export async function startSupportConversation(
  rawInput: z.infer<typeof supportConversationStartRequestSchema>,
): Promise<SupportConversationStartResult> {
  const input = supportConversationStartRequestSchema.parse(rawInput);
  const { admin, organizationId, supabase } =
    await getSupportDeliveryContext();
  const { data: begun, error: beginError } = await supabase.rpc(
    "start_support_conversation",
    {
      contact_name: input.contactName,
      contact_phone: input.contactPhone,
      message_content: input.message,
      request_id: input.clientRequestId,
      target_channel_connection_id: input.channelConnectionId,
      target_organization_id: organizationId,
    },
  );

  if (beginError) throw mapStartError(beginError);
  const start = startResultSchema.parse(begun);

  try {
    const delivery = await deliverSupportMessageAttempt(
      admin,
      organizationId,
      start,
    );
    return {
      ...delivery,
      conversationCreated: start.conversationCreated,
      conversationId: start.conversationId,
      provider: start.provider,
    };
  } catch (error) {
    if (error instanceof SupportMessageSendError) {
      throw new SupportConversationStartError(
        error.message,
        error.httpStatus,
        start.conversationId,
      );
    }
    throw error;
  }
}

function mapStartError(error: { code?: string; message: string }) {
  if (error.code === "28000") {
    return new SupportConversationStartError("Sessão expirada.", 401);
  }
  if (error.code === "42501") {
    return new SupportConversationStartError(
      "Sem acesso para iniciar este atendimento.",
      403,
    );
  }
  if (error.code === "P0002") {
    return new SupportConversationStartError(
      "Canal não encontrado nesta organização.",
      404,
    );
  }
  if (error.code === "55000") {
    if (error.message.includes("channel_connection_not_ready")) {
      return new SupportConversationStartError(
        "Conecte o WhatsApp deste canal antes de iniciar.",
        409,
      );
    }
    if (error.message.includes("channel_credentials_not_found")) {
      return new SupportConversationStartError(
        "Complete as credenciais deste canal antes de iniciar.",
        409,
      );
    }
    if (error.message.includes("support_assignment_required")) {
      return new SupportConversationStartError(
        "Atendimento existente já está com outro responsável.",
        409,
      );
    }
  }
  if (error.code === "22023") {
    return new SupportConversationStartError(
      "Revise telefone e primeira mensagem.",
      400,
    );
  }
  return new SupportConversationStartError(
    "Não foi possível iniciar o atendimento.",
    500,
  );
}
