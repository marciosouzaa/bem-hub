import { z } from "zod";

import {
  contactPhoneReasonSchema,
  contactPhoneStatusSchema,
} from "@/features/contacts/contact-schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const supportChannelOperationalStatusSchema = z.enum([
  "connected",
  "disconnected",
  "inactive",
]);

const supportChannelSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["official", "unofficial"]),
  name: z.string(),
  phoneNumber: z.string().nullable(),
  operationalStatus: supportChannelOperationalStatusSchema,
  deletedAt: z.string().nullable(),
});

export const supportInboxItemSchema = z.object({
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
  channel: supportChannelSchema.extend({
    provider: z.string(),
  }),
});

const supportMessageBaseSchema = z.object({
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

const supportDeliveryStatusSchema = z.enum([
  "not_sent",
  "sending",
  "accepted",
  "sent",
  "delivered",
  "read",
  "failed",
]);

const supportMessageDeliveryStateSchema = z.object({
  messageId: z.string().uuid(),
  status: supportDeliveryStatusSchema,
  updatedAt: z.string().nullable(),
  acceptedAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  readAt: z.string().nullable(),
  failedAt: z.string().nullable(),
});

const supportMessageSchema = supportMessageBaseSchema.extend({
  deliveryStatus: supportDeliveryStatusSchema,
  deliveryUpdatedAt: z.string().nullable(),
  acceptedAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  readAt: z.string().nullable(),
  deliveryFailedAt: z.string().nullable(),
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
  channel: supportChannelSchema,
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
export type SupportChannelOperationalStatus = z.infer<
  typeof supportChannelOperationalStatusSchema
>;
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
  const [
    conversationResult,
    stateResult,
    eventsResult,
    deliveryStatesResult,
  ] = await Promise.all([
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
    supabase.rpc("get_support_message_delivery_states", {
      target_organization_id: organizationId,
      target_conversation_id: conversationId,
    }),
  ]);

  const error = conversationResult.error
    ?? stateResult.error
    ?? eventsResult.error
    ?? deliveryStatesResult.error;
  if (error) {
    throw new Error(`Falha ao abrir atendimento: ${error.message}`);
  }

  const conversationData = z.record(
    z.string(),
    z.unknown(),
  ).parse(conversationResult.data);
  const deliveryStates = z.array(
    supportMessageDeliveryStateSchema,
  ).parse(deliveryStatesResult.data);
  const deliveryByMessage = new Map(
    deliveryStates.map((delivery) => [delivery.messageId, delivery]),
  );
  const messages = z.array(supportMessageBaseSchema)
    .parse(conversationData.messages)
    .map((message) => {
      const delivery = deliveryByMessage.get(message.id);
      return {
        ...message,
        acceptedAt: delivery?.acceptedAt ?? null,
        deliveredAt: delivery?.deliveredAt ?? null,
        deliveryFailedAt: delivery?.failedAt ?? null,
        deliveryStatus: delivery?.status ?? getLegacyDeliveryStatus(message),
        deliveryUpdatedAt: delivery?.updatedAt ?? null,
        readAt: delivery?.readAt ?? null,
        sentAt: delivery?.sentAt ?? null,
      };
    });

  return supportConversationSchema.parse({
    ...conversationData,
    ...supportConversationStateSchema.parse(stateResult.data),
    events: supportEventsSchema.parse(eventsResult.data),
    messages,
  });
}

function getLegacyDeliveryStatus(
  message: z.infer<typeof supportMessageBaseSchema>,
) {
  if (message.direction !== "outbound") return "not_sent" as const;
  if (message.status === "sending") return "sending" as const;
  if (message.status === "sent") return "accepted" as const;
  if (message.status === "failed") return "failed" as const;
  return "not_sent" as const;
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
