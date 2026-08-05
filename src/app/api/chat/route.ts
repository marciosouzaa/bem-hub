import { streamText, type ModelMessage } from "ai";
import { z } from "zod";
import {
  EntitlementError,
  getEntitlementErrorMessage,
  getEntitlements,
  getMonthlyAssistantMessageCount,
  requireFeature,
  requireLimitAvailable,
} from "@/features/billing/entitlements";
import {
  buildChatSystemPrompt,
  retrieveChatKnowledge,
} from "@/features/chat/rag";
import {
  CHAT_KNOWLEDGE_HEADER,
  encodeKnowledgeContextHeader,
} from "@/features/chat/sources";
import { getOrCreateWorkspace } from "@/features/organizations/bootstrap";
import {
  AiRuntimeError,
  resolveAssistantRuntime,
} from "@/lib/ai/runtime";
import { EmbeddingRuntimeError } from "@/lib/ai/embeddings";
import { getErrorDetails, logServerError } from "@/lib/observability/server";
import { getGenerationTemperatureOptions } from "@/lib/ai/generation-options";
import { isMissingColumnError } from "@/lib/supabase/schema-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const chatRequestSchema = z.object({
  requestId: z.string().uuid(),
  conversationId: z
    .string()
    .uuid()
    .nullish()
    .transform((value) => value ?? undefined),
  assistantId: z
    .string()
    .uuid()
    .nullish()
    .transform((value) => value ?? undefined),
  message: z.string().trim().min(1).max(8000),
});

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

class ChatHttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ChatHttpError";
    this.status = status;
  }
}

export async function POST(request: Request) {
  const requestStartedAt = performance.now();
  const body = chatRequestSchema.safeParse(await request.json());

  if (!body.success) {
    return Response.json(
      { error: "Payload inválido.", issues: body.error.issues },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json({ error: "Sessão expirada." }, { status: 401 });
    }

    const workspace = await getOrCreateWorkspace(supabase, { user });
    const organizationId = workspace.organization.id;
    const entitlements = await getEntitlements(supabase, organizationId);

    try {
      requireFeature(entitlements, "chat");
      const monthlyMessages = await getMonthlyAssistantMessageCount(
        supabase,
        organizationId,
      );
      requireLimitAvailable(entitlements, "monthlyMessages", monthlyMessages);
    } catch (error) {
      if (error instanceof EntitlementError) {
        return Response.json(
          {
            error:
              getEntitlementErrorMessage(error) ??
              "Plano atual não permite esta operação.",
            code: error.code,
            plan: error.planKey,
            limit: error.limit,
            used: error.used,
          },
          { status: error.code === "feature_disabled" ? 403 : 402 },
        );
      }

      throw error;
    }

    const assistant = await resolveAssistant(
      supabase,
      body.data.assistantId,
      organizationId,
    );

    if (!assistant) {
      return Response.json(
        { error: "Assistente não encontrado nesta organização." },
        { status: 404 },
      );
    }

    const runtime = await resolveAssistantRuntime(
      supabase,
      organizationId,
      assistant,
    );
    const rag = await retrieveChatKnowledge({
      entitlements,
      organizationId,
      query: body.data.message,
      supabase,
    });
    const conversation = await resolveConversation(supabase, {
      assistantId: assistant.id,
      conversationId: body.data.conversationId,
      message: body.data.message,
      organizationId,
      userId: user.id,
    });

    if (
      conversation.assistant_id &&
      conversation.assistant_id !== assistant.id
    ) {
      return Response.json(
        {
          error:
            "Esta conversa pertence a outro assistente. Abra uma nova conversa para trocar.",
        },
        { status: 409 },
      );
    }

    const { error: messageError } = await supabase.from("messages").insert({
      organization_id: organizationId,
      conversation_id: conversation.id,
      role: "user",
      content: body.data.message,
      model: runtime.model,
      request_id: body.data.requestId,
      metadata: {
        assistant_id: assistant.id,
        provider: runtime.provider,
        provider_connection_id: runtime.providerConnectionId,
      },
    });

    if (messageError) {
      if (messageError.code === "23505") {
        return Response.json(
          { error: "Esta mensagem ja foi processada.", code: "duplicate_request" },
          { status: 409 },
        );
      }
      throw new ChatHttpError(
        `Falha ao salvar mensagem: ${messageError.message}`,
        500,
      );
    }

    const messages = await loadModelMessages(
      supabase,
      organizationId,
      conversation.id,
    );

    const result = streamText({
      model: runtime.languageModel,
      system: buildChatSystemPrompt(assistant.instructions, rag.systemContext),
      messages,
      ...getGenerationTemperatureOptions(
        runtime.provider,
        runtime.model,
        assistant.temperature,
      ),
      onEnd: async ({ text, usage, finishReason }) => {
        const { error: completionError } = await supabase.rpc(
          "finalize_chat_completion",
          {
            target_organization_id: organizationId,
            target_conversation_id: conversation.id,
            message_content: text,
            model_name: runtime.model,
            input_tokens: usage.inputTokens ?? null,
            output_tokens: usage.outputTokens ?? null,
            message_metadata: {
              assistant_id: assistant.id,
              provider: runtime.provider,
              provider_connection_id: runtime.providerConnectionId,
              finish_reason: finishReason,
              knowledge: rag.knowledge,
            },
            usage_metadata: {
              assistant_id: assistant.id,
              conversation_id: conversation.id,
              provider: runtime.provider,
              provider_connection_id: runtime.providerConnectionId,
              finish_reason: finishReason,
              knowledge_status: rag.knowledge.status,
              knowledge_source_count: rag.knowledge.sources.length,
              knowledge_embedding_model: rag.knowledge.embeddingModel,
              latency_ms: Math.round(performance.now() - requestStartedAt),
            },
          },
        );

        if (completionError) {
          logServerError("chat.completion.persistence_failed", completionError, {
            organizationId,
            conversationId: conversation.id,
            assistantId: assistant.id,
            provider: runtime.provider,
            model: runtime.model,
          });
          await recordChatFailure(supabase, {
            assistantId: assistant.id,
            conversationId: conversation.id,
            error: completionError,
            model: runtime.model,
            organizationId,
            provider: runtime.provider,
            stage: "persistence",
            userId: user.id,
          });
        }
      },
      onError: async ({ error }) => {
        logServerError("chat.stream.failed", error, {
          organizationId,
          conversationId: conversation.id,
          assistantId: assistant.id,
          provider: runtime.provider,
          model: runtime.model,
        });
        await recordChatFailure(supabase, {
          assistantId: assistant.id,
          conversationId: conversation.id,
          error,
          model: runtime.model,
          organizationId,
          provider: runtime.provider,
          stage: "stream",
          userId: user.id,
        });
      },
    });

    return result.toTextStreamResponse({
      headers: {
        [CHAT_KNOWLEDGE_HEADER]: encodeKnowledgeContextHeader(rag.knowledge),
        "x-conversation-id": conversation.id,
      },
    });
  } catch (error) {
    if (error instanceof AiRuntimeError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof EmbeddingRuntimeError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof ChatHttpError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    logServerError("chat.request.failed", error, { route: "/api/chat" });
    return Response.json(
      { error: "Falha ao processar a conversa." },
      { status: 500 },
    );
  }
}

async function resolveAssistant(
  supabase: SupabaseServerClient,
  assistantId: string | undefined,
  organizationId: string,
) {
  let query = supabase
    .from("assistants")
    .select(
      "id,name,instructions,provider,provider_connection_id,model,temperature,is_default",
    )
    .eq("organization_id", organizationId);

  if (assistantId) {
    query = query.eq("id", assistantId);
  } else {
    query = query.eq("is_default", true);
  }

  const { data, error } = await query
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (
      isMissingColumnError(error, [
        "assistants.provider",
        "provider_connection_id",
      ])
    ) {
      return resolveAssistantFromLegacySchema(
        supabase,
        assistantId,
        organizationId,
      );
    }

    throw new ChatHttpError(`Falha ao buscar assistente: ${error.message}`, 500);
  }

  return data;
}

async function resolveAssistantFromLegacySchema(
  supabase: SupabaseServerClient,
  assistantId: string | undefined,
  organizationId: string,
) {
  let query = supabase
    .from("assistants")
    .select("id,name,instructions,model,temperature,is_default")
    .eq("organization_id", organizationId);

  if (assistantId) {
    query = query.eq("id", assistantId);
  } else {
    query = query.eq("is_default", true);
  }

  const { data, error } = await query
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ChatHttpError(`Falha ao buscar assistente: ${error.message}`, 500);
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    provider: "openai" as const,
    provider_connection_id: null,
  };
}

async function resolveConversation(
  supabase: SupabaseServerClient,
  {
    assistantId,
    conversationId,
    message,
    organizationId,
    userId,
  }: {
    assistantId: string;
    conversationId: string | undefined;
    message: string;
    organizationId: string;
    userId: string;
  },
) {
  if (conversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id,organization_id,assistant_id,user_id,title")
      .eq("id", conversationId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) {
      throw new ChatHttpError(`Falha ao buscar conversa: ${error.message}`, 500);
    }

    if (!data) {
      throw new ChatHttpError("Conversa não encontrada nesta organização.", 404);
    }

    return data;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      organization_id: organizationId,
      assistant_id: assistantId,
      user_id: userId,
      title: createConversationTitle(message),
    })
    .select("id,organization_id,assistant_id,user_id,title")
    .single();

  if (error) {
    throw new ChatHttpError(`Falha ao criar conversa: ${error.message}`, 500);
  }

  return data;
}

async function loadModelMessages(
  supabase: SupabaseServerClient,
  organizationId: string,
  conversationId: string,
): Promise<ModelMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role,content,created_at")
    .eq("organization_id", organizationId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(40);

  if (error) {
    throw new ChatHttpError(`Falha ao carregar histórico: ${error.message}`, 500);
  }

  return data
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role === "user" ? ("user" as const) : ("assistant" as const),
      content: message.content,
    }));
}

async function recordChatFailure(
  supabase: SupabaseServerClient,
  event: {
    assistantId: string;
    conversationId: string;
    error: unknown;
    model: string;
    organizationId: string;
    provider: string;
    stage: "stream" | "persistence";
    userId: string;
  },
) {
  const details = getErrorDetails(event.error);
  const { error } = await supabase.from("usage_events").insert({
    organization_id: event.organizationId,
    user_id: event.userId,
    event_type: "chat.failed",
    model: event.model,
    metadata: {
      assistant_id: event.assistantId,
      conversation_id: event.conversationId,
      provider: event.provider,
      stage: event.stage,
      error_name: details.name,
      error_code: details.code ?? null,
    },
  });

  if (error) {
    logServerError("chat.failure_telemetry.failed", error, {
      organizationId: event.organizationId,
      conversationId: event.conversationId,
      stage: event.stage,
    });
  }
}

function createConversationTitle(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
}
