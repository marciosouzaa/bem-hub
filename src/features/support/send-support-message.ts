import { revalidatePath } from "next/cache";
import { z } from "zod";

import { channelProviderCredentialsSchema } from "@/features/channels/channel-provider-schema";
import { ChannelProviderRequestError } from "@/features/channels/providers/provider-http";
import { resolveChannelProvider } from "@/features/channels/providers/resolve-channel-provider";
import { getOrCreateWorkspace } from "@/features/organizations/bootstrap";
import { decryptSecret, EncryptionConfigError } from "@/lib/security/encryption";
import {
  createSupabaseAdminClient,
  SupabaseAdminConfigError,
} from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const directSupportMessageSchema = z.object({
  clientRequestId: z.string().uuid(),
  content: z.string().trim().min(1).max(10_000),
  conversationId: z.string().uuid(),
});

export const retrySupportMessageSchema = z.object({
  clientRequestId: z.string().uuid(),
  messageId: z.string().uuid(),
});

export const supportMessageRequestSchema = z.discriminatedUnion("action", [
  directSupportMessageSchema.extend({ action: z.literal("send") }),
  retrySupportMessageSchema.extend({ action: z.literal("retry") }),
]);

const beginResultSchema = z.object({
  attemptId: z.string().uuid(),
  created: z.boolean(),
  messageId: z.string().uuid(),
  status: z.enum(["sending", "sent", "failed", "uncertain"]),
});

const deliverySchema = z.object({
  attemptId: z.string().uuid(),
  connectionStatus: z.string(),
  content: z.string().min(1),
  conversationId: z.string().uuid(),
  encryptedCredentials: z.string().min(1),
  messageId: z.string().uuid(),
  provider: z.string().min(1),
  recipient: z.string().trim().min(3).max(300),
  status: z.literal("sending"),
});

export type DirectSupportMessageResult = {
  duplicate: boolean;
  messageId: string;
  status: "sending" | "sent";
};

export class SupportMessageSendError extends Error {
  readonly httpStatus: number;

  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = "SupportMessageSendError";
    this.httpStatus = httpStatus;
  }
}

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
    beginResultSchema.parse(begun),
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
    beginResultSchema.parse(begun),
  );
}

async function deliverSupportMessageAttempt(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  organizationId: string,
  begin: z.infer<typeof beginResultSchema>,
): Promise<DirectSupportMessageResult> {
  if (!begin.created) {
    if (begin.status === "failed") {
      throw new SupportMessageSendError(
        "Este envio falhou. Use Tentar novamente na própria mensagem.",
        409,
      );
    }
    if (begin.status === "uncertain") {
      throw new SupportMessageSendError(
        "A confirmação deste envio está pendente. Confira o WhatsApp antes de tentar novamente.",
        409,
      );
    }
    return {
      duplicate: true,
      messageId: begin.messageId,
      status: begin.status,
    };
  }

  const { data: deliveryData, error: deliveryError } = await admin.rpc(
    "get_support_message_delivery_attempt",
    {
      target_attempt_id: begin.attemptId,
      target_message_id: begin.messageId,
      target_organization_id: organizationId,
    },
  );

  if (deliveryError || !deliveryData) {
    await markFailed(admin, organizationId, begin.messageId, begin.attemptId, {
      errorCode: "delivery_context_unavailable",
    });
    throw new SupportMessageSendError(
      "Não foi possível preparar o envio deste atendimento.",
      422,
    );
  }

  try {
    const delivery = deliverySchema.parse(deliveryData);
    if (delivery.connectionStatus !== "connected") {
      throw new SupportMessageSendError(
        "O WhatsApp deste canal não está conectado.",
        422,
      );
    }

    const credentials = channelProviderCredentialsSchema.parse(
      JSON.parse(decryptSecret(delivery.encryptedCredentials)),
    );
    if (credentials.provider !== delivery.provider) {
      throw new SupportMessageSendError(
        "As credenciais não correspondem ao canal deste atendimento.",
        422,
      );
    }

    const adapter = resolveChannelProvider(credentials);
    if (!adapter.sendTextMessage) {
      throw new SupportMessageSendError(
        "Este provedor ainda não permite enviar mensagens pelo atendimento.",
        422,
      );
    }

    const sent = await adapter.sendTextMessage({
      recipient: delivery.recipient,
      text: delivery.content,
      trackingId: delivery.messageId,
    });
    const { error: finalizeError } = await admin.rpc(
      "finalize_support_message_send_attempt",
      {
        delivery_metadata: {
          acceptedAt: new Date().toISOString(),
          provider: delivery.provider,
        },
        delivery_status: "sent",
        provider_message_id: sent.externalMessageId,
        target_attempt_id: delivery.attemptId,
        target_message_id: delivery.messageId,
        target_organization_id: organizationId,
      },
    );
    if (finalizeError) {
      throw new SupportMessageSendError(
        "A mensagem saiu, mas o histórico não confirmou o envio. Não reenvie antes de conferir o WhatsApp.",
        500,
      );
    }

    revalidatePath(`/app/support/${delivery.conversationId}`);
    revalidatePath("/app/support");
    return { duplicate: false, messageId: delivery.messageId, status: "sent" };
  } catch (error) {
    if (
      error instanceof SupportMessageSendError
      && error.message.startsWith("A mensagem saiu")
    ) {
      throw error;
    }
    await markFailed(admin, organizationId, begin.messageId, begin.attemptId, {
      errorCode: getDeliveryErrorCode(error),
      failedAt: new Date().toISOString(),
    });
    throw mapDeliveryError(error);
  }
}

async function markFailed(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  organizationId: string,
  messageId: string,
  attemptId: string,
  metadata: Record<string, string>,
) {
  await admin.rpc("finalize_support_message_send_attempt", {
    delivery_metadata: metadata,
    delivery_status: "failed",
    provider_message_id: "",
    target_attempt_id: attemptId,
    target_message_id: messageId,
    target_organization_id: organizationId,
  });
}

async function getSupportDeliveryContext() {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new SupportMessageSendError("Sessão expirada.", 401);
  }

  const workspace = await getOrCreateWorkspace(
    supabase,
    { user: authData.user },
  );

  try {
    return {
      admin: createSupabaseAdminClient(),
      organizationId: workspace.organization.id,
      supabase,
    };
  } catch (error) {
    throw mapDeliveryError(error);
  }
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

function mapDeliveryError(error: unknown) {
  if (error instanceof SupportMessageSendError) return error;
  if (error instanceof ChannelProviderRequestError) {
    return new SupportMessageSendError(error.message, 502);
  }
  if (error instanceof EncryptionConfigError) {
    return new SupportMessageSendError(
      "A chave de integração do canal não está configurada.",
      500,
    );
  }
  if (error instanceof SupabaseAdminConfigError) {
    return new SupportMessageSendError(
      "O serviço seguro de canais não está configurado.",
      500,
    );
  }
  if (error instanceof z.ZodError || error instanceof SyntaxError) {
    return new SupportMessageSendError(
      "O provedor retornou dados incompatíveis.",
      502,
    );
  }
  return new SupportMessageSendError("Não foi possível enviar a mensagem.", 500);
}

function getDeliveryErrorCode(error: unknown) {
  if (error instanceof ChannelProviderRequestError) {
    return error.status ? `provider_http_${error.status}` : "provider_unavailable";
  }
  if (error instanceof SupportMessageSendError) return "delivery_not_allowed";
  if (error instanceof z.ZodError) return "provider_payload_invalid";
  if (error instanceof SyntaxError) return "credentials_invalid";
  return "delivery_failed";
}
