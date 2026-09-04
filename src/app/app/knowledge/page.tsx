import { UpgradeCTA } from "@/features/billing/upgrade-cta";
import { getEntitlements, hasFeature } from "@/features/billing/entitlements";
import { KnowledgeWorkspace } from "@/features/knowledge-base/knowledge-workspace";
import { getKnowledgeStats, listKnowledgeDocuments, searchKnowledgeDocuments, type KnowledgeSearchResult } from "@/features/knowledge-base/queries";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { resolveOpenAIEmbeddingRuntime } from "@/lib/ai/embeddings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const organizationId = workspace.organization.id;
  const entitlements = await getEntitlements(supabase, organizationId);
  if (!hasFeature(entitlements, "knowledgeBase")) return <div className="mx-auto max-w-4xl px-5 py-8 md:px-8"><UpgradeCTA description={`O módulo de base de conhecimento não está liberado para o plano ${entitlements.plan.name}. Atualize o plano para enviar documentos e ativar busca semântica.`} feature="knowledgeBase" planName={entitlements.plan.name} title="Base de conhecimento indisponível neste plano" /></div>;

  const documents = await listKnowledgeDocuments(supabase, organizationId);
  const searchQuery = params.q?.trim() ?? "";
  const searchState = searchQuery ? await runSearch(supabase, organizationId, searchQuery) : { results: [], error: null };
  return <KnowledgeWorkspace canManage={["owner", "admin"].includes(workspace.membership.role)} documents={documents} searchError={searchState.error} searchQuery={searchQuery} searchResults={searchState.results} stats={getKnowledgeStats(documents)} />;
}

async function runSearch(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, organizationId: string, query: string): Promise<{ results: KnowledgeSearchResult[]; error: string | null }> {
  try {
    const runtime = await resolveOpenAIEmbeddingRuntime(supabase, organizationId);
    return { results: await searchKnowledgeDocuments(supabase, organizationId, query, runtime), error: null };
  } catch (error) {
    return { results: [], error: error instanceof Error ? error.message : "Falha ao executar busca semântica." };
  }
}
