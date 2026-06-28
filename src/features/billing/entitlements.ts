import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { planLimits, type PlanKey, type PlanLimit } from "./plans";

type Supabase = SupabaseClient<Database>;

export const featureIds = [
  "assistants",
  "chat",
  "knowledgeBase",
  "automations",
  "integrations",
] as const;

export type FeatureId = (typeof featureIds)[number];

export type LimitId = keyof PlanLimit;

type EntitlementPlan = {
  key: PlanKey;
  name: string;
  limits: PlanLimit;
  modules: Record<FeatureId, boolean>;
};

export type Entitlements = {
  organizationId: string;
  subscriptionStatus: Database["public"]["Enums"]["subscription_status"] | null;
  plan: EntitlementPlan;
};

export type LimitCheck = {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
};

const planKeySchema = z.enum(["free", "starter", "pro", "business"]);

const planLimitsSchema = z.object({
  users: z.coerce.number().int().min(0).default(1),
  assistants: z.coerce.number().int().min(0).default(1),
  monthlyMessages: z.coerce.number().int().min(0).default(50),
  documents: z.coerce.number().int().min(0).default(5),
  integrations: z.coerce.number().int().min(0).default(0),
});

const modulesSchema = z
  .object({
    assistants: z.boolean().optional(),
    chat: z.boolean().optional(),
    knowledgeBase: z.boolean().optional(),
    automations: z.boolean().optional(),
    integrations: z.boolean().optional(),
  })
  .optional();

const planJsonSchema = planLimitsSchema.extend({
  modules: modulesSchema,
});

export class EntitlementError extends Error {
  code: "feature_disabled" | "limit_exceeded" | "subscription_inactive";
  feature?: FeatureId;
  limitId?: LimitId;
  limit?: number;
  used?: number;
  planKey?: PlanKey;

  constructor(
    message: string,
    details: {
      code: EntitlementError["code"];
      feature?: FeatureId;
      limitId?: LimitId;
      limit?: number;
      used?: number;
      planKey?: PlanKey;
    },
  ) {
    super(message);
    this.name = "EntitlementError";
    this.code = details.code;
    this.feature = details.feature;
    this.limitId = details.limitId;
    this.limit = details.limit;
    this.used = details.used;
    this.planKey = details.planKey;
  }
}

export async function getEntitlements(
  supabase: Supabase,
  organizationId: string,
): Promise<Entitlements> {
  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("plan_id,status")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (subscriptionError) {
    throw new Error(`Falha ao buscar assinatura: ${subscriptionError.message}`);
  }

  if (!subscription || !isSubscriptionUsable(subscription.status)) {
    return {
      organizationId,
      subscriptionStatus: subscription?.status ?? null,
      plan: buildPlan("free", "Free", planLimits.free),
    };
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("key,name,limits")
    .eq("id", subscription.plan_id)
    .maybeSingle();

  if (planError) {
    throw new Error(`Falha ao buscar plano: ${planError.message}`);
  }

  if (!plan) {
    return {
      organizationId,
      subscriptionStatus: subscription.status,
      plan: buildPlan("free", "Free", planLimits.free),
    };
  }

  const planKey = planKeySchema.safeParse(plan.key).success
    ? (plan.key as PlanKey)
    : "free";

  return {
    organizationId,
    subscriptionStatus: subscription.status,
    plan: buildPlan(planKey, plan.name, plan.limits),
  };
}

export function hasFeature(entitlements: Entitlements, feature: FeatureId) {
  return entitlements.plan.modules[feature];
}

export function requireFeature(
  entitlements: Entitlements,
  feature: FeatureId,
) {
  if (!hasFeature(entitlements, feature)) {
    throw new EntitlementError(
      `O modulo ${feature} nao esta disponivel no plano ${entitlements.plan.name}.`,
      {
        code: "feature_disabled",
        feature,
        planKey: entitlements.plan.key,
      },
    );
  }
}

export function checkLimit(
  entitlements: Entitlements,
  limitId: LimitId,
  used: number,
): LimitCheck {
  const limit = entitlements.plan.limits[limitId];
  const remaining = Math.max(limit - used, 0);

  return {
    allowed: used < limit,
    limit,
    used,
    remaining,
  };
}

export function requireLimitAvailable(
  entitlements: Entitlements,
  limitId: LimitId,
  used: number,
) {
  const check = checkLimit(entitlements, limitId, used);

  if (!check.allowed) {
    throw new EntitlementError(
      `Limite do plano ${entitlements.plan.name} atingido para ${limitId}.`,
      {
        code: "limit_exceeded",
        limitId,
        limit: check.limit,
        used: check.used,
        planKey: entitlements.plan.key,
      },
    );
  }

  return check;
}

export async function getMonthlyUsageCount(
  supabase: Supabase,
  organizationId: string,
  eventType: string,
  date = new Date(),
) {
  const monthStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
  );

  const { count, error } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("event_type", eventType)
    .gte("created_at", monthStart.toISOString());

  if (error) {
    throw new Error(`Falha ao consultar uso mensal: ${error.message}`);
  }

  return count ?? 0;
}

export async function getMonthlyAssistantMessageCount(
  supabase: Supabase,
  organizationId: string,
  date = new Date(),
) {
  const monthStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
  );

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("role", "assistant")
    .gte("created_at", monthStart.toISOString());

  if (error) {
    throw new Error(`Falha ao consultar mensagens mensais: ${error.message}`);
  }

  return count ?? 0;
}

export function getEntitlementErrorMessage(error: unknown) {
  if (error instanceof EntitlementError) {
    if (error.code === "limit_exceeded") {
      return `Limite do plano atingido (${error.used}/${error.limit}). Atualize o plano para continuar.`;
    }

    if (error.code === "feature_disabled") {
      return "Este modulo nao esta disponivel no plano atual.";
    }

    return "Assinatura inativa para esta operacao.";
  }

  return null;
}

function buildPlan(
  key: PlanKey,
  name: string,
  limitsJson: Json | PlanLimit,
): EntitlementPlan {
  const fallback = planLimits[key];
  const parsed = planJsonSchema.safeParse(limitsJson);
  const limits = parsed.success
    ? {
        users: parsed.data.users,
        assistants: parsed.data.assistants,
        monthlyMessages: parsed.data.monthlyMessages,
        documents: parsed.data.documents,
        integrations: parsed.data.integrations,
      }
    : fallback;
  const explicitModules = parsed.success ? parsed.data.modules : undefined;

  return {
    key,
    name,
    limits,
    modules: {
      assistants: explicitModules?.assistants ?? limits.assistants > 0,
      chat: explicitModules?.chat ?? limits.monthlyMessages > 0,
      knowledgeBase: explicitModules?.knowledgeBase ?? limits.documents > 0,
      automations: explicitModules?.automations ?? key !== "free",
      integrations: explicitModules?.integrations ?? limits.integrations > 0,
    },
  };
}

function isSubscriptionUsable(
  status: Database["public"]["Enums"]["subscription_status"],
) {
  return status === "active" || status === "trialing" || status === "manual";
}
