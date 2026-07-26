import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { channelProviderCredentialsSchema } from "@/features/channels/channel-provider-schema";
import { ChannelProviderRequestError } from "@/features/channels/providers/provider-http";
import { resolveChannelProvider } from "@/features/channels/providers/resolve-channel-provider";
import { getOrCreateWorkspace } from "@/features/organizations/bootstrap";
import type { DirectSupportMessageResult } from "@/features/support/support-message-contracts";
import { decryptSecret, EncryptionConfigError } from "@/lib/security/encryption";
import {
  createSupabaseAdminClient,
  SupabaseAdminConfigError,
} from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const supportMessageBeginResultSchema = z.object({
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

export class SupportMessageSendError extends Error {
  readonly httpStatus: number;

  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = "SupportMessageSendError";
    this.httpStatus = httpStatus;
  }
}

export async function getSupportDeliveryContext() {
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

export async function deliverSupportMessageAttempt(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  organizationId: string,
  begin: z.infer<typeof supportMessageBeginResultSchema>,
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
