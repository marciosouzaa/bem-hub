import {
  Bot,
  ChevronRight,
  FileText,
  Grid2X2,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  ContentGrid,
  ContextPanel,
  PageHeader,
  PageLayout,
  SectionHeader,
  SplitPanel,
} from "@/components/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MotionPage, MotionSurface } from "@/components/ui/motion";
import { getUsageSnapshot } from "@/features/analytics/queries";
import { listAssistants } from "@/features/assistants/queries";
import { listConversations } from "@/features/chat/queries";
import {
  getKnowledgeStats,
  listKnowledgeDocuments,
} from "@/features/knowledge-base/queries";
import { OnboardingChecklist } from "@/features/onboarding/onboarding-checklist";
import { buildOnboardingProgress } from "@/features/onboarding/queries";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function WorkspacePage() {
  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const organizationId = workspace.organization.id;
  const [assistants, documents, conversations] = await Promise.all([
    listAssistants(supabase, organizationId),
    listKnowledgeDocuments(supabase, organizationId),
    listConversations(supabase, organizationId),
  ]);
  const knowledge = getKnowledgeStats(documents);
  const onboarding = buildOnboardingProgress({
    hasAssistant: assistants.length > 0,
    hasReadyDocument: knowledge.ready > 0,
    hasConversation: conversations.length > 0,
  });
  const usage =
    workspace.membership.role === "member"
      ? null
      : await getUsageSnapshot(supabase, organizationId);
  const firstName =
    workspace.profile.name?.split(" ")[0] ||
    workspace.profile.email?.split("@")[0] ||
    "Operador";

  return (
    <MotionPage>
      <PageLayout>
        <SplitPanel>
          <section className="min-w-0 space-y-7">
            <PageHeader
              className="min-h-[142px]"
              description={
                <>Acompanhe uso, conhecimento e conversas reais do workspace.</>
              }
              title={<>Bom dia, {firstName}.</>}
            />

            {onboarding.nextStep ? (
              <MotionSurface>
                <OnboardingChecklist
                  organizationName={workspace.organization.name}
                  progress={onboarding}
                />
              </MotionSurface>
            ) : null}

            <ContentGrid columns={3}>
              <SummaryCard
                action="Abrir chat"
                href="/app/chat"
                icon={MessageSquareText}
                label="Conversas"
                supporting={`${usage?.completions24h ?? 0} respostas nas ultimas 24h`}
                value={conversations.length}
              />
              <SummaryCard
                action="Gerenciar"
                href="/app/assistants"
                icon={Bot}
                label="Assistentes"
                supporting={
                  assistants.find((assistant) => assistant.isDefault)?.name ??
                  "Nenhum assistente padrao"
                }
                value={assistants.length}
              />
              <SummaryCard
                action="Ver documentos"
                href="/app/knowledge"
                icon={FileText}
                label="Documentos prontos"
                supporting={`${knowledge.chunks} trechos pesquisaveis`}
                value={knowledge.ready}
              />
            </ContentGrid>

            <MotionSurface>
              <Card>
                <CardHeader>
                  <SectionHeader
                    actions={
                      <Button asChild variant="ghost">
                        <Link href="/app/chat">Ver historico</Link>
                      </Button>
                    }
                    marker
                    title="Conversas recentes"
                  />
                </CardHeader>
                <CardContent>
                  {conversations.length ? (
                    <div className="divide-y divide-panel-border">
                      {conversations.slice(0, 5).map((conversation) => (
                        <Link
                          className="grid grid-cols-[40px_1fr_auto] items-center gap-4 py-4 first:pt-0 last:pb-0 hover:text-primary focus-visible:rounded-[var(--radius-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                          href={`/app/chat?conversationId=${conversation.id}`}
                          key={conversation.id}
                        >
                          <span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated text-primary">
                            <MessageSquareText className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {conversation.title || "Conversa sem titulo"}
                            </span>
                            <span className="mt-1 block text-xs text-muted">
                              Atualizada no workspace
                            </span>
                          </span>
                          <span className="text-xs text-muted">
                            {formatConversationDate(conversation.updatedAt)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <EmptyDashboardState
                      action="Iniciar conversa"
                      description="As conversas da equipe aparecerao aqui depois da primeira pergunta."
                      href="/app/chat"
                      title="Nenhuma conversa registrada"
                    />
                  )}
                </CardContent>
              </Card>
            </MotionSurface>
          </section>

          <ContextPanel>
            <MotionSurface>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-[0.12em]">
                    Proxima acao
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    [Sparkles, "Perguntar a IA", "/app/chat"],
                    [Plus, "Criar assistente", "/app/assistants"],
                    [FileText, "Enviar documento", "/app/knowledge"],
                  ].map(([Icon, label, href]) => (
                    <Link
                      className="flex w-full items-center justify-between rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-4 py-4 text-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                      href={href as string}
                      key={label as string}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="size-5 text-primary" />
                        {label as string}
                      </span>
                      <ChevronRight className="size-4 text-muted" />
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </MotionSurface>

            <MotionSurface>
              <Card className="border-primary/40 bg-sidebar-active/45">
                <CardContent className="p-5 md:pt-5">
                  <Badge>Workspace isolado</Badge>
                  <div className="mt-4 flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-5 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {workspace.organization.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-strong">
                        Papel: {workspace.membership.role}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </MotionSurface>

            <MotionSurface>
              <Card className="os-grid overflow-hidden">
                <CardContent className="p-5 md:pt-5">
                  <Grid2X2 className="size-5 text-primary" />
                  <p className="mt-4 text-lg font-semibold">
                    Pulso de conhecimento
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-strong">
                    {knowledge.ready
                      ? `${knowledge.ready} documentos prontos fornecem ${knowledge.chunks} trechos para respostas.`
                      : "Envie um documento para fundamentar respostas do assistente."}
                  </p>
                  {usage && usage.unanswered7d > 0 ? (
                    <p className="mt-3 text-xs text-warning">
                      {usage.unanswered7d} perguntas sem evidencia nos ultimos 7 dias.
                    </p>
                  ) : null}
                  <Button asChild className="mt-5" size="sm" variant="secondary">
                    <Link href="/app/knowledge">Abrir conhecimento</Link>
                  </Button>
                </CardContent>
              </Card>
            </MotionSurface>
          </ContextPanel>
        </SplitPanel>
      </PageLayout>
    </MotionPage>
  );
}

function SummaryCard({
  action,
  href,
  icon: Icon,
  label,
  supporting,
  value,
}: {
  action: string;
  href: string;
  icon: typeof Zap;
  label: string;
  supporting: string;
  value: number;
}) {
  return (
    <MotionSurface className="h-full">
      <Card className="flex h-full min-h-[168px] flex-col">
        <CardContent className="flex flex-1 flex-col p-5 md:p-6">
          <div className="flex items-start justify-between">
            <span className="flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-sidebar-active text-primary">
              <Icon className="size-4" />
            </span>
            <span className="font-mono text-2xl font-semibold text-primary">
              {value}
            </span>
          </div>
          <p className="mt-4 text-sm font-medium">{label}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
            {supporting}
          </p>
          <Link className="mt-auto pt-4 text-xs font-medium text-primary" href={href}>
            {action}
          </Link>
        </CardContent>
      </Card>
    </MotionSurface>
  );
}

function EmptyDashboardState({
  action,
  description,
  href,
  title,
}: {
  action: string;
  description: string;
  href: string;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <MessageSquareText className="size-6 text-muted" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-5 text-muted">{description}</p>
      <Button asChild className="mt-4" size="sm" variant="secondary">
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}

function formatConversationDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}
