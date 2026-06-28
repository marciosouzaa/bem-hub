import {
  Bot,
  Boxes,
  ChevronRight,
  Database,
  FileText,
  FolderKanban,
  Grid2X2,
  MessageSquareText,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  UserPlus,
  Users,
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
import { MotionItem, MotionPage, MotionSurface } from "@/components/ui/motion";
import { getRequiredWorkspace } from "@/features/organizations/queries";

const recentConversations = [
  {
    icon: ShieldCheck,
    title: "Sessão de estratégia de produto",
    excerpt: "Plano de expansão pronto para revisão da operação.",
    time: "2 min",
  },
  {
    icon: MessageSquareText,
    title: "Triagem de atendimento",
    excerpt: "3 conversas precisam de resposta com base no histórico.",
    time: "15 min",
  },
  {
    icon: Users,
    title: "Alinhamento comercial",
    excerpt: "Resumo de objeções dos pilotos foi consolidado.",
    time: "1 h",
  },
];

const integrations = [TerminalSquare, FileText, FolderKanban, Boxes, Database];

export default async function WorkspacePage() {
  const workspace = await getRequiredWorkspace();
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
                <>
                  Seu workspace está pronto para operar assistentes, conversas
                  e documentos com isolamento por organização.
                </>
              }
              title={<>Bom dia, {firstName}.</>}
            />

            <ContentGrid columns={2}>
              <MotionSurface className="h-full">
                <Card className="os-panel-glow flex h-full min-h-[166px] flex-col">
                  <CardContent className="flex flex-1 flex-col p-6 md:pt-6">
                    <div className="flex items-start justify-between">
                      <Zap className="size-5 text-primary" />
                      <span className="font-mono text-xs font-semibold text-primary">
                        base MVP
                      </span>
                    </div>
                    <p className="mt-5 text-2xl font-semibold">Chat</p>
                    <p className="mt-1 text-sm text-muted-strong">
                      Próximo fluxo em implantação com histórico persistente.
                    </p>
                  </CardContent>
                </Card>
              </MotionSurface>

              <MotionSurface className="h-full">
                <Card className="flex h-full min-h-[166px] flex-col">
                  <CardContent className="flex flex-1 flex-col p-6 md:pt-6">
                    <p className="text-sm text-muted-strong">
                      Eficiência ativa
                    </p>
                    <div className="mt-5 flex h-12 items-end gap-2">
                      {[38, 30, 46, 58, 38, 22].map((height, index) => (
                        <span
                          className={[
                            "w-8 rounded-t-sm",
                            index === 3
                              ? "bg-primary shadow-[var(--shadow-glow)]"
                              : "bg-sidebar-active",
                          ].join(" ")}
                          key={index}
                          style={{ height }}
                        />
                      ))}
                    </div>
                    <p className="mt-4 text-3xl font-semibold text-primary">
                      94.2%
                    </p>
                  </CardContent>
                </Card>
              </MotionSurface>

              <MotionSurface className="h-full">
                <Card className="h-full min-h-[190px]">
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle>Assistentes ativos</CardTitle>
                    <span className="text-muted">...</span>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      ["Atendimento", "Pronto", "bg-primary"],
                      ["Operações", "Processando", "bg-warning"],
                    ].map(([name, status, color]) => (
                      <div className="flex items-center gap-3" key={name}>
                        <span className="flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-sidebar-active text-primary">
                          <Bot className="size-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium">{name}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-muted">
                            <span
                              className={`size-1.5 rounded-full ${color}`}
                            />
                            {status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </MotionSurface>

              <MotionSurface className="h-full">
                <Card className="h-full min-h-[190px]">
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle>Execução operacional</CardTitle>
                    <Link
                      className="text-xs font-medium text-primary"
                      href="/app/chat"
                    >
                      Abrir chat
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      ["Persistência de conversas", "82%", "w-[82%]"],
                      ["RAG com fontes", "35%", "w-[35%]"],
                    ].map(([name, value, width]) => (
                      <div key={name}>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-strong">{name}</span>
                          <span className="text-primary">{value}</span>
                        </div>
                        <div className="mt-2 h-1 rounded-full bg-panel-subtle">
                          <div
                            className={`h-full rounded-full bg-primary ${width}`}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </MotionSurface>
            </ContentGrid>

            <MotionSurface>
              <Card>
                <CardHeader>
                  <SectionHeader
                    actions={
                      <Button asChild variant="ghost">
                        <Link href="/app/chat">Ver histórico</Link>
                      </Button>
                    }
                    marker
                    title="Conversas recentes"
                  />
                </CardHeader>
                <CardContent className="space-y-5">
                  {recentConversations.map(
                    ({ icon: Icon, title, excerpt, time }) => (
                      <MotionItem
                        className="grid grid-cols-[40px_1fr_auto] items-center gap-4"
                        key={title}
                      >
                        <span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated text-primary">
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {title}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted">
                            {excerpt}
                          </p>
                        </div>
                        <span className="text-xs text-muted">{time}</span>
                      </MotionItem>
                    ),
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
                    Ações rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    [Sparkles, "Perguntar à IA", "/app/chat"],
                    [Plus, "Criar assistente", "/app/assistants"],
                    [UserPlus, "Convidar membro", "/app"],
                  ].map(([Icon, label, href]) => (
                    <Link
                      className="flex w-full items-center justify-between rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-4 py-4 text-left text-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
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
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm uppercase tracking-[0.12em]">
                    Integrações
                  </CardTitle>
                  <Settings className="size-4 text-muted" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    {integrations.map((Icon, index) => (
                      <button
                        className="flex size-12 items-center justify-center rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated text-muted-strong transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                        key={index}
                        type="button"
                      >
                        <Icon className="size-5" />
                      </button>
                    ))}
                    <button className="flex size-12 items-center justify-center rounded-[var(--radius-control)] border border-dashed border-panel-border text-muted transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">
                      <Plus className="size-5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </MotionSurface>

            <MotionSurface>
              <Card className="border-primary/70 bg-sidebar-active">
                <CardContent className="p-5 md:pt-5">
                  <Badge>Todos os sistemas nominais</Badge>
                  <dl className="mt-5 space-y-1 text-xs text-muted-strong">
                    <div className="flex justify-between">
                      <dt>API Latency</dt>
                      <dd>22ms</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Agent Uptime</dt>
                      <dd>99.98%</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Knowledge Synced</dt>
                      <dd>14m atrás</dd>
                    </div>
                  </dl>
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
                    A base documental entra na próxima fase do MVP, depois do
                    chat persistente com fontes.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href="/app/chat">Abrir conversa</Link>
                    </Button>
                    <Button size="sm" variant="secondary">
                      Dispensar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </MotionSurface>
          </ContextPanel>
        </SplitPanel>
      </PageLayout>
    </MotionPage>
  );
}
