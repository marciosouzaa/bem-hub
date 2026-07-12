import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type UsageSnapshot = {
  completions24h: number;
  completions7d: number;
  unanswered7d: number;
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
  const [last24h, last7d, noMatch, noDocuments] = await Promise.all([
    baseQuery().gte("created_at", since24h),
    baseQuery().gte("created_at", since7d),
    baseQuery()
      .gte("created_at", since7d)
      .contains("metadata", { knowledge_status: "no_match" }),
    baseQuery()
      .gte("created_at", since7d)
      .contains("metadata", { knowledge_status: "no_documents" }),
  ]);
  const error =
    last24h.error ?? last7d.error ?? noMatch.error ?? noDocuments.error;

  if (error) {
    throw new Error(`Falha ao calcular metricas de uso: ${error.message}`);
  }

  return buildUsageSnapshot({
    completions24h: last24h.count ?? 0,
    completions7d: last7d.count ?? 0,
    unanswered7d: (noMatch.count ?? 0) + (noDocuments.count ?? 0),
  });
}

export function buildUsageSnapshot(input: {
  completions24h: number;
  completions7d: number;
  unanswered7d: number;
}): UsageSnapshot {
  const unanswered7d = Math.min(input.unanswered7d, input.completions7d);

  return {
    ...input,
    unanswered7d,
  };
}
