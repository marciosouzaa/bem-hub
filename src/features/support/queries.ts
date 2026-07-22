import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const supportInboxItemSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "pending", "resolved", "escalated"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  lastMessageAt: z.string(),
  assignedTo: z.string().uuid().nullable(),
  contact: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    tags: z.array(z.string()),
  }),
  channel: z.object({
    id: z.string().uuid(),
    kind: z.enum(["official", "unofficial"]),
    provider: z.string(),
    name: z.string(),
    phoneNumber: z.string(),
  }),
});

const supportMessageSchema = z.object({
  id: z.string().uuid(),
  direction: z.enum(["inbound", "outbound"]),
  content: z.string(),
  status: z.enum([
    "received",
    "draft",
    "approved",
    "rejected",
    "sent",
    "failed",
  ]),
  createdAt: z.string(),
});

const supportConversationSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "pending", "resolved", "escalated"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  contact: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
  }),
  channel: z.object({
    id: z.string().uuid(),
    name: z.string(),
    phoneNumber: z.string(),
    kind: z.enum(["official", "unofficial"]),
  }),
  messages: z.array(supportMessageSchema),
});

export type SupportInboxItem = z.infer<typeof supportInboxItemSchema>;
export type SupportConversation = z.infer<typeof supportConversationSchema>;
export type SupportMessage = z.infer<typeof supportMessageSchema>;

export async function listSupportInbox(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_support_inbox", {
    target_organization_id: organizationId,
  });

  if (error) {
    throw new Error(`Falha ao carregar atendimentos: ${error.message}`);
  }

  return z.array(supportInboxItemSchema).parse(data);
}

export async function getSupportConversation(
  organizationId: string,
  conversationId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_support_conversation", {
    target_organization_id: organizationId,
    target_conversation_id: conversationId,
  });

  if (error) {
    throw new Error(`Falha ao abrir atendimento: ${error.message}`);
  }

  return supportConversationSchema.parse(data);
}
