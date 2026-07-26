import { z } from "zod";

import {
  contactPhoneReasonSchema,
  contactPhoneStatusSchema,
} from "@/features/contacts/contact-schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const supportInboxItemSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "pending", "resolved", "escalated"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  lastMessageAt: z.string(),
  assignedTo: z.string().uuid().nullable(),
  assignee: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  }).nullable(),
  unreadCount: z.number().int().nonnegative(),
  contact: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    tags: z.array(z.string()),
    phoneStatus: contactPhoneStatusSchema.default("invalid"),
    phoneReason: contactPhoneReasonSchema.nullable().default(null),
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
    "sending",
    "sent",
    "failed",
  ]),
  createdAt: z.string(),
});

const supportConversationSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "pending", "resolved", "escalated"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  assignedTo: z.string().uuid().nullable(),
  assignedAt: z.string().nullable(),
  assignee: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  }).nullable(),
  resolvedAt: z.string().nullable(),
  resolvedBy: z.string().uuid().nullable(),
  updatedAt: z.string(),
  version: z.number().int().positive(),
  contact: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    phoneStatus: contactPhoneStatusSchema.default("invalid"),
    phoneReason: contactPhoneReasonSchema.nullable().default(null),
  }),
  channel: z.object({
    id: z.string().uuid(),
    name: z.string(),
    phoneNumber: z.string(),
    kind: z.enum(["official", "unofficial"]),
  }),
  messages: z.array(supportMessageSchema),
  events: z.array(z.object({
    id: z.string().uuid(),
    type: z.enum([
      "conversation.assigned",
      "conversation.status_changed",
      "conversation.priority_changed",
    ]),
    actorId: z.string().uuid().nullable(),
    actorName: z.string().nullable(),
    previousValue: z.string().nullable(),
    nextValue: z.string().nullable(),
    createdAt: z.string(),
  })),
});

const supportConversationStateSchema = supportConversationSchema.pick({
  assignedAt: true,
  assignedTo: true,
  assignee: true,
  resolvedAt: true,
  resolvedBy: true,
  updatedAt: true,
  version: true,
});

const supportEventsSchema = supportConversationSchema.shape.events;

const supportMetricsSchema = z.object({
  open: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  escalated: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
  unassigned: z.number().int().nonnegative(),
  resolvedLast7Days: z.number().int().nonnegative(),
  averageResolutionMinutes: z.number().nonnegative().nullable(),
});

export type SupportInboxItem = z.infer<typeof supportInboxItemSchema>;
export type SupportConversation = z.infer<typeof supportConversationSchema>;
export type SupportMessage = z.infer<typeof supportMessageSchema>;
export type SupportMetrics = z.infer<typeof supportMetricsSchema>;

export async function listSupportInbox(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_support_inbox_operational", {
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
  const [conversationResult, stateResult, eventsResult] = await Promise.all([
    supabase.rpc("get_support_conversation", {
      target_organization_id: organizationId,
      target_conversation_id: conversationId,
    }),
    supabase.rpc("get_support_conversation_state", {
      target_organization_id: organizationId,
      target_conversation_id: conversationId,
    }),
    supabase.rpc("get_support_conversation_events", {
      event_limit: 40,
      target_organization_id: organizationId,
      target_conversation_id: conversationId,
    }),
  ]);

  const error = conversationResult.error
    ?? stateResult.error
    ?? eventsResult.error;
  if (error) {
    throw new Error(`Falha ao abrir atendimento: ${error.message}`);
  }

  return supportConversationSchema.parse({
    ...z.record(z.string(), z.unknown()).parse(conversationResult.data),
    ...supportConversationStateSchema.parse(stateResult.data),
    events: supportEventsSchema.parse(eventsResult.data),
  });
}

export async function getSupportMetrics(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    "get_support_operational_metrics",
    { target_organization_id: organizationId },
  );

  if (error) {
    throw new Error(`Falha ao carregar métricas de atendimento: ${error.message}`);
  }

  return supportMetricsSchema.parse(data);
}
