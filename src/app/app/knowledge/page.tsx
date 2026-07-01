import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MotionItem, MotionPage, MotionSurface } from "@/components/ui/motion";
import { cn } from "@/lib/utils";
import {
  getEntitlements,
  hasFeature,
} from "@/features/billing/entitlements";
import { UpgradeCTA } from "@/features/billing/upgrade-cta";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { resolveOpenAIEmbeddingRuntime } from "@/lib/ai/embeddings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { KnowledgeUploadForm } from "@/features/knowledge-base/knowledge-upload-form";
import {
  getKnowledgeStats,
  listKnowledgeDocuments,
  searchKnowledgeDocuments,
  type KnowledgeDocumentListItem,
  type KnowledgeSearchResult,
} from "@/features/knowledge-base/queries";

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const organizationId = workspace.organization.id;
  const entitlements = await getEntitlements(supabase, organizationId);
  const featureEnabled = hasFeature(entitlements, "knowledgeBase");

  if (!featureEnabled) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
        <UpgradeCTA
          description={`O modulo de base de conhecimento nao esta liberado para o plano ${entitlements.plan.name}. Atualize o plano para enviar documentos e ativar busca semantica.`}
          feature="knowledgeBase"
          planName={entitlements.plan.name}
          title="Base de conhecimento indisponivel neste plano"
        />
      </div>
    );
  }

  const documents = await listKnowledgeDocuments(supabase, organizationId);
  const stats = getKnowledgeStats(documents);
  const canManage = ["owner", "admin"].includes(workspace.membership.role);
  const searchQuery = params.q?.trim() ?? "";
  const searchState = searchQuery
    ? await runSearch(supabase, organizationId, searchQuery)
    : { results: [], error: null };

  return (
    <MotionPage className="mx-auto grid max-w-7xl gap-6 px-5 py-8 md:px-8 xl:grid-cols-[300px_1fr]">
      <aside className="space-y-5">
        <Card className="ai-premium-surface overflow-hidden">
          <CardHeader>
            <Badge>Base documental</Badge>
            <CardTitle className="text-2xl">Conhecimento da empresa</CardTitle>
            <p className="text-sm leading-6 text-muted-strong">
              Envie documentos, processe chunks e use busca semantica com
              isolamento por organizacao.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Metric label="Documentos" value={stats.total.toString()} />
            <Metric label="Prontos" value={stats.ready.toString()} />
            <Metric label="Chunks" value={stats.chunks.toString()} />
            <Metric label="Falhas" value={stats.failed.toString()} />
          </CardContent>
        </Card>

        <KnowledgeUploadForm canManage={canManage} />

        {!canManage ? (
          <Card className="border-warning/50 bg-panel-elevated">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="mt-0.5 size-4 text-warning" />
              <div>
                <p className="text-sm font-medium">Modo somente leitura</p>
                <p className="mt-1 text-sm leading-6 text-muted-strong">
                  Membros podem consultar documentos, mas apenas owners e admins
                  podem enviar novos arquivos.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </aside>

      <section className="min-w-0 space-y-6">
        <div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge>Busca semantica</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-normal">
                Documentos prontos para IA
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-strong">
                Pesquise nos chunks vetorizados e acompanhe status de ingestao,
                falhas e volume processado por documento.
              </p>
            </div>
          </div>

          <form className="mt-5 flex flex-col gap-3 rounded-[var(--radius-panel)] border border-panel-border bg-panel p-3 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                className="h-11 w-full rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated pl-10 pr-3 text-sm outline-none transition placeholder:text-muted focus:border-primary"
                defaultValue={searchQuery}
                name="q"
                placeholder="Buscar por politica, cliente, procedimento..."
              />
            </label>
            <Button type="submit">
              <Search className="size-4" />
              Buscar
            </Button>
          </form>
        </div>

        {searchQuery ? (
          <SearchResults
            error={searchState.error}
            query={searchQuery}
            results={searchState.results}
          />
        ) : null}

        <div className="space-y-4">
          {documents.length ? (
            documents.map((document) => (
              <DocumentCard document={document} key={document.id} />
            ))
          ) : (
            <EmptyState canManage={canManage} />
          )}
        </div>
      </section>
    </MotionPage>
  );
}

async function runSearch(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  query: string,
): Promise<{ results: KnowledgeSearchResult[]; error: string | null }> {
  try {
    const runtime = await resolveOpenAIEmbeddingRuntime(supabase, organizationId);
    const results = await searchKnowledgeDocuments(
      supabase,
      organizationId,
      query,
      runtime,
    );

    return { results, error: null };
  } catch (error) {
    return {
      results: [],
      error:
        error instanceof Error
          ? error.message
          : "Falha ao executar busca semantica.",
    };
  }
}

function SearchResults({
  error,
  query,
  results,
}: {
  error: string | null;
  query: string;
  results: KnowledgeSearchResult[];
}) {
  return (
    <MotionSurface>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-4 text-primary" />
            Resultados para &quot;{query}&quot;
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-3 text-sm text-danger">
              {error}
            </p>
          ) : results.length ? (
            results.map((result) => (
              <div
                className="rounded-md border border-panel-border bg-panel-elevated p-4"
                key={result.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{result.documentName}</p>
                  <span className="font-mono text-xs text-primary">
                    {(result.similarity * 100).toFixed(1)}% similar
                  </span>
                </div>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-strong">
                  {result.content}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-strong">
              Nenhum chunk pronto encontrou similaridade para esta busca.
            </p>
          )}
        </CardContent>
      </Card>
    </MotionSurface>
  );
}

function DocumentCard({ document }: { document: KnowledgeDocumentListItem }) {
  const status = getStatus(document.status);

  return (
    <MotionSurface>
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between md:space-y-0">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sidebar-active text-primary">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0">
              <CardTitle className="truncate text-lg">{document.name}</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-strong">
                {formatMimeType(document.mimeType)} - {formatFileSize(document.fileSize)}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em]",
              status.className,
            )}
          >
            {status.icon}
            {status.label}
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <InfoTile label="Chunks" value={document.chunkCount.toString()} />
            <InfoTile
              label="Modelo"
              value={document.embeddingModel ?? "Nao definido"}
            />
            <InfoTile
              label="Criado em"
              value={new Intl.DateTimeFormat("pt-BR").format(
                new Date(document.createdAt),
              )}
            />
            <InfoTile
              label="Processado"
              value={
                document.processedAt
                  ? new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      month: "2-digit",
                    }).format(new Date(document.processedAt))
                  : "Pendente"
              }
            />
          </div>

          {document.error ? (
            <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-3 text-sm leading-6 text-danger">
              {document.error}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </MotionSurface>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-panel-border bg-panel-elevated px-3 py-3">
      <p className="text-xs uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-2 font-mono text-2xl text-primary">{value}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-panel-border bg-panel-elevated px-3 py-3">
      <p className="text-xs uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-2 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function EmptyState({ canManage }: { canManage: boolean }) {
  return (
    <MotionItem>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-md bg-sidebar-active text-primary">
            <Database className="size-6" />
          </span>
          <h2 className="mt-5 text-xl font-semibold">
            Nenhum documento enviado
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-strong">
            {canManage
              ? "Envie o primeiro TXT ou Markdown para iniciar a base semantica."
              : "A equipe ainda nao enviou documentos para este workspace."}
          </p>
        </CardContent>
      </Card>
    </MotionItem>
  );
}

function getStatus(status: KnowledgeDocumentListItem["status"]) {
  if (status === "ready") {
    return {
      label: "Pronto",
      icon: <CheckCircle2 className="size-3.5" />,
      className: "border-primary/30 bg-sidebar-active text-primary",
    };
  }

  if (status === "failed") {
    return {
      label: "Falhou",
      icon: <AlertTriangle className="size-3.5" />,
      className: "border-danger/30 bg-danger/10 text-danger",
    };
  }

  return {
    label: status === "processing" ? "Processando" : "Enviado",
    icon: <Loader2 className="size-3.5" />,
    className: "border-warning/30 bg-warning/10 text-warning",
  };
}

function formatFileSize(size: number | null) {
  if (!size) {
    return "tamanho nao informado";
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatMimeType(mimeType: string) {
  if (mimeType.includes("markdown")) {
    return "Markdown";
  }

  if (mimeType === "text/plain") {
    return "TXT";
  }

  if (mimeType === "application/pdf") {
    return "PDF";
  }

  if (mimeType.includes("wordprocessingml")) {
    return "DOCX";
  }

  return mimeType;
}
