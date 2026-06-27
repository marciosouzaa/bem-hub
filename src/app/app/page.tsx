import {
  BarChart3,
  Bell,
  Bot,
  Boxes,
  ChevronRight,
  Database,
  FileText,
  FolderKanban,
  Grid2X2,
  LayoutDashboard,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  UserPlus,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { UserMenu } from "@/components/app/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MotionItem,
  MotionPage,
  MotionSection,
  MotionSurface,
} from "@/components/ui/motion";
import { getRequiredWorkspace } from "@/features/organizations/queries";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Bot, label: "Assistentes" },
  { icon: Workflow, label: "Agentes IA" },
  { icon: Zap, label: "Automações" },
  { icon: Database, label: "Base de conhecimento" },
  { icon: FileText, label: "Documentos" },
  { icon: MessageSquareText, label: "Conversas" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Users, label: "Time" },
  { icon: Settings, label: "Configurações" },
];

const recentConversations = [
  {
    icon: ShieldCheck,
    title: "Sessão de estratégia de produto",
    excerpt: "O plano de expansão para a região Sul está pronto para revisão.",
    time: "2 min",
  },
  {
    icon: MessageSquareText,
    title: "Loop de feedback #442",
    excerpt: "Conflito detectado na regra de automação 77. Requer revisão.",
    time: "15 min",
  },
  {
    icon: Users,
    title: "Sarah Mitchell",
    excerpt: "Podemos publicar a nova integração vetorial em staging?",
    time: "1 h",
  },
];

const integrations = [TerminalSquare, FileText, FolderKanban, Boxes, Database];

export default async function WorkspacePage() {
  const workspace = await getRequiredWorkspace();
  const firstName =
    workspace.profile.name?.split(" ")[0] ||
    workspace.profile.email?.split("@")[0] ||
    "Marcio";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[256px_1fr]">
        <aside className="flex min-h-screen flex-col border-r border-panel-border bg-sidebar px-5 py-6">
          <Link href="/app" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <TerminalSquare className="size-5" />
            </span>
            <span>
              <span className="block text-lg font-semibold leading-none">
                BEM HUB
              </span>
              <span className="mt-1 block text-xs uppercase tracking-[0.12em] text-muted">
                AI Operating System
              </span>
            </span>
          </Link>

          <nav className="mt-10 space-y-1">
            {navItems.map(({ icon: Icon, label, active }) => (
              <Link
                key={label}
                className={[
                  "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition",
                  active
                    ? "bg-sidebar-active text-primary"
                    : "text-muted-strong hover:bg-panel-subtle hover:text-foreground",
                ].join(" ")}
                href={label === "Assistentes" ? "/app/assistants" : "/app"}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-8">
            <Button className="w-full" size="lg">
              <Sparkles className="size-4" />
              Ask AI
            </Button>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="flex h-16 items-center gap-4 border-b border-panel-border bg-background/95 px-5 md:px-8">
            <div className="relative max-w-3xl flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                className="h-10 w-full rounded-lg border border-panel-border bg-panel px-11 text-sm text-foreground outline-none transition placeholder:text-[#6f7772] focus:border-primary"
                placeholder="Buscar no sistema operacional..."
              />
            </div>
            <Button aria-label="Abrir terminal" size="icon" variant="ghost">
              <TerminalSquare className="size-5" />
            </Button>
            <Button aria-label="Notificações" size="icon" variant="ghost">
              <Bell className="size-5" />
            </Button>
            <div className="hidden h-8 w-px bg-panel-border md:block" />
            <UserMenu
              email={workspace.profile.email}
              name={firstName}
              organization={workspace.organization.name}
              role={workspace.membership.role}
            />
          </header>

          <MotionPage className="mx-auto grid max-w-6xl gap-6 px-5 py-8 md:px-8 lg:grid-cols-[1fr_282px]">
            <section className="min-w-0 space-y-6">
              <MotionSection className="py-4">
                <h1 className="text-4xl font-semibold tracking-normal md:text-[42px]">
                  Bom dia, {firstName}.
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-strong">
                  Seus agentes concluíram{" "}
                  <span className="text-primary">12 tarefas</span> enquanto
                  você estava fora e há{" "}
                  <span className="text-primary">3 conversas prioritárias</span>{" "}
                  aguardando revisão.
                </p>
              </MotionSection>

              <div className="grid gap-5 md:grid-cols-2">
                <MotionSurface>
                <Card className="os-panel-glow min-h-40">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <Zap className="size-5 text-primary" />
                      <span className="font-mono text-xs font-semibold text-primary">
                        +14% vs ontem
                      </span>
                    </div>
                    <p className="mt-5 text-2xl font-semibold">184</p>
                    <p className="mt-1 text-sm text-muted-strong">
                      Automações executadas hoje
                    </p>
                  </CardContent>
                </Card>
                </MotionSurface>

                <MotionSurface>
                <Card className="min-h-40">
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-strong">Eficiência ativa</p>
                    <div className="mt-5 flex h-12 items-end gap-2">
                      {[38, 30, 46, 58, 38, 22].map((height, index) => (
                        <span
                          key={index}
                          className={[
                            "w-8 rounded-t-sm",
                            index === 3
                              ? "bg-primary shadow-[var(--shadow-glow)]"
                              : "bg-[#1e4a38]",
                          ].join(" ")}
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

                <MotionSurface>
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle>Assistentes ativos</CardTitle>
                    <span className="text-muted">•••</span>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      ["Atendimento V2", "Escutando", "bg-primary"],
                      ["Estrategista criativo", "Processando", "bg-warning"],
                    ].map(([name, status, color]) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-md bg-sidebar-active text-primary">
                          <Bot className="size-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium">{name}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-muted">
                            <span className={`size-1.5 rounded-full ${color}`} />
                            {status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                </MotionSurface>

                <MotionSurface>
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle>Agentes em execução</CardTitle>
                    <button className="text-xs font-medium text-primary">
                      Ver todos
                    </button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      ["Data Scraper #04", "82%", "w-[82%]"],
                      ["Market Analyzer", "35%", "w-[35%]"],
                    ].map(([name, value, width]) => (
                      <div key={name}>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-strong">{name}</span>
                          <span className="text-primary">{value}</span>
                        </div>
                        <div className="mt-2 h-1 rounded-full bg-[#242725]">
                          <div
                            className={`h-full rounded-full bg-primary ${width}`}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                </MotionSurface>
              </div>

              <MotionSurface>
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-4">
                    <span className="h-9 w-1 rounded-full bg-primary" />
                    <CardTitle className="text-2xl">
                      Conversas recentes
                    </CardTitle>
                  </div>
                  <Button variant="ghost">Ver histórico</Button>
                </CardHeader>
                <CardContent className="space-y-5">
                  {recentConversations.map(({ icon: Icon, title, excerpt, time }) => (
                    <MotionItem
                      key={title}
                      className="grid grid-cols-[40px_1fr_auto] items-center gap-4"
                    >
                      <span className="flex size-10 items-center justify-center rounded-lg border border-panel-border bg-panel-elevated text-primary">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{title}</p>
                        <p className="mt-1 truncate text-xs text-muted">
                          {excerpt}
                        </p>
                      </div>
                      <span className="text-xs text-muted">{time}</span>
                    </MotionItem>
                  ))}
                </CardContent>
              </Card>
              </MotionSurface>
            </section>

            <aside className="space-y-6">
              <MotionSurface>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-[0.12em]">
                    Ações rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    [Sparkles, "Perguntar à IA"],
                    [Plus, "Criar assistente"],
                    [UserPlus, "Convidar membro"],
                  ].map(([Icon, label]) => (
                    <button
                      key={label as string}
                      className="flex w-full items-center justify-between rounded-md border border-panel-border bg-panel-elevated px-4 py-4 text-left text-sm transition hover:border-primary hover:text-primary"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="size-5 text-primary" />
                        {label as string}
                      </span>
                      <ChevronRight className="size-4 text-muted" />
                    </button>
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
                        key={index}
                        className="flex size-12 items-center justify-center rounded-md border border-panel-border bg-panel-elevated text-muted-strong transition hover:border-primary hover:text-primary"
                      >
                        <Icon className="size-5" />
                      </button>
                    ))}
                    <button className="flex size-12 items-center justify-center rounded-md border border-dashed border-panel-border text-muted transition hover:border-primary hover:text-primary">
                      <Plus className="size-5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
              </MotionSurface>

              <MotionSurface>
              <Card className="border-primary/70 bg-[#102019]">
                <CardContent className="p-5">
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
                <CardContent className="p-5">
                  <Grid2X2 className="size-5 text-primary" />
                  <p className="mt-4 text-lg font-semibold">
                    Pulso de conhecimento
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-strong">
                    Foram analisados 24 documentos recentes. Há sobreposição
                    entre Segurança Interna e Compliance 2024.
                  </p>
                  <div className="mt-5 flex gap-2">
                    <Button size="sm">Revisar fusão</Button>
                    <Button size="sm" variant="secondary">
                      Dispensar
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </MotionSurface>
            </aside>
          </MotionPage>
        </section>
      </div>
    </main>
  );
}
