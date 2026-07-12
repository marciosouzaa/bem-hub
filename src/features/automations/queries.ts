import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type AutomationRunListItem = {
  id: string;
  status: Database["public"]["Enums"]["run_status"];
  templateId: string | null;
  outputText: string | null;
  error: string | null;
  createdAt: string;
};

export async function listAutomationRuns(
  supabase: Supabase,
  organizationId: string,
): Promise<AutomationRunListItem[]> {
  const { data, error } = await supabase
    .from("automation_runs")
    .select("id,status,input,output,error,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Falha ao buscar automacoes: ${error.message}`);
  }

  return data.map((run) => ({
    id: run.id,
    status: run.status,
    templateId: readString(run.input, "template_id"),
    outputText: readString(run.output, "text"),
    error: run.error,
    createdAt: run.created_at,
  }));
}

function readString(value: Json | null, key: string) {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const item = value[key];
  return typeof item === "string" ? item : null;
}
