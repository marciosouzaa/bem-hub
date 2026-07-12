import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type UsageSnapshot = {
  completions24h: number;
  completions7d: number;
  unanswered7d: number;
  failures7d: number;
  tokens7d: number;
  activeUsers7d: number;
  averageLatencyMs: number;
};

export async function getUsageSnapshot(
  supabase: Supabase,
  organizationId: string,
  now = new Date(),
): Promise<UsageSnapshot> {
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const baseQuery = () =>
    supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("event_type", "chat.completion");
  const [last24h, last7d, noMatch, noDocuments, failures, details] = await Promise.all([
    baseQuery().gte("created_at", since24h),
    baseQuery().gte("created_at", since7d),
    baseQuery()
      .gte("created_at", since7d)
      .contains("metadata", { knowledge_status: "no_match" }),
    baseQuery()
      .gte("created_at", since7d)
      .contains("metadata", { knowledge_status: "no_documents" }),
    supabase.from("usage_events").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("event_type", "chat.failed")
      .gte("created_at", since7d),
    supabase.from("usage_events").select("tokens_input,tokens_output,user_id,metadata")
      .eq("organization_id", organizationId).eq("event_type", "chat.completion")
      .gte("created_at", since7d),
  ]);
  const error =
    last24h.error ?? last7d.error ?? noMatch.error ?? noDocuments.error ??
    failures.error ?? details.error;

  if (error) {
    throw new Error(`Falha ao calcular metricas de uso: ${error.message}`);
  }

  const operational = buildOperationalMetrics(details.data ?? []);
  return buildUsageSnapshot({
    completions24h: last24h.count ?? 0,
    completions7d: last7d.count ?? 0,
    unanswered7d: (noMatch.count ?? 0) + (noDocuments.count ?? 0),
    failures7d: failures.count ?? 0,
    ...operational,
  });
}

export function buildUsageSnapshot(input: {
  completions24h: number;
  completions7d: number;
  unanswered7d: number;
  failures7d?: number;
  tokens7d?: number;
  activeUsers7d?: number;
  averageLatencyMs?: number;
}): UsageSnapshot {
  const unanswered7d = Math.min(input.unanswered7d, input.completions7d);

  return {
    ...input,
    unanswered7d,
    failures7d: input.failures7d ?? 0,
    tokens7d: input.tokens7d ?? 0,
    activeUsers7d: input.activeUsers7d ?? 0,
    averageLatencyMs: input.averageLatencyMs ?? 0,
  };
}

export function buildOperationalMetrics(
  events: Array<{
    tokens_input: number | null;
    tokens_output: number | null;
    user_id: string | null;
    metadata: unknown;
  }>,
) {
  const latencies = events.flatMap((event) => {
    if (typeof event.metadata !== "object" || event.metadata === null || !("latency_ms" in event.metadata)) return [];
    const latency = Number(event.metadata.latency_ms);
    return Number.isFinite(latency) && latency >= 0 ? [latency] : [];
  });
  return {
    tokens7d: events.reduce((sum, event) => sum + (event.tokens_input ?? 0) + (event.tokens_output ?? 0), 0),
    activeUsers7d: new Set(events.flatMap((event) => event.user_id ? [event.user_id] : [])).size,
    averageLatencyMs: latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : 0,
  };
}
