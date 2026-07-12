import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ChatMessage, ConversationListItem } from "./types";
import { parseMessageKnowledgeContext } from "./sources";

type Supabase = SupabaseClient<Database>;

export async function listConversations(
  supabase: Supabase,
  organizationId: string,
): Promise<ConversationListItem[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      "id,organization_id,assistant_id,user_id,title,created_at,updated_at",
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) {
    throw new Error(`Falha ao buscar conversas: ${error.message}`);
  }

  return data.map(mapConversation);
}

export async function getConversation(
  supabase: Supabase,
  organizationId: string,
  conversationId: string,
): Promise<ConversationListItem | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      "id,organization_id,assistant_id,user_id,title,created_at,updated_at",
    )
    .eq("id", conversationId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar conversa: ${error.message}`);
  }

  return data ? mapConversation(data) : null;
}

export async function listConversationMessages(
  supabase: Supabase,
  organizationId: string,
  conversationId: string,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id,organization_id,conversation_id,role,content,tokens_input,tokens_output,model,metadata,created_at",
    )
    .eq("organization_id", organizationId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Falha ao buscar mensagens: ${error.message}`);
  }

  return data.map((message) => ({
    id: message.id,
    organizationId: message.organization_id,
    conversationId: message.conversation_id,
    role: message.role,
    content: message.content,
    model: message.model,
    tokensInput: message.tokens_input,
    tokensOutput: message.tokens_output,
    knowledge: parseMessageKnowledgeContext(message.metadata),
    createdAt: message.created_at,
  }));
}

function mapConversation(conversation: {
  id: string;
  organization_id: string;
  assistant_id: string | null;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}): ConversationListItem {
  return {
    id: conversation.id,
    organizationId: conversation.organization_id,
    assistantId: conversation.assistant_id,
    userId: conversation.user_id,
    title: conversation.title,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
  };
}
