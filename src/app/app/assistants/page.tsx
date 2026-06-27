import {
  Bot,
  BrainCircuit,
  ChevronLeft,
  Database,
  LayoutDashboard,
  Lock,
  MessageSquareText,
  Plus,
  Settings,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { UserMenu } from "@/components/app/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MotionItem, MotionPage, MotionSurface } from "@/components/ui/motion";
import {
  deleteAssistantAction,
  setDefaultAssistantAction,
} from "@/features/assistants/actions";
import {
  listAssistants,
  type AssistantListItem,
} from "@/features/assistants/queries";
import {
  AssistantForm,
  DeleteAssistantForm,
  SetDefaultAssistantForm,
} from "@/features/assistants/assistant-forms";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/app" },
  { icon: Bot, label: "Assistentes", href: "/app/assistants", active: true },
  { icon: MessageSquareText, label: "Conversas", href: "/app" },
  { icon: Database, label: "Base de conhecimento", href: "/app" },
  { icon: Settings, label: "Configuracoes", href: "/app" },
];

export default async function AssistantsPage() {
  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const assistants = await listAssistants(supabase, workspace.organization.id);
  const canManage = ["owner", "admin"].includes(workspace.membership.role);
  const defaultAssistant = assistants.find((assistant) => assistant.isDefault);
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
              <Sparkles className="size-5" />
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
            {navItems.map(({ icon: Icon, label, href, active }) => (
              <Link
                key={label}
                className={[
                  "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition",
                  active
                    ? "bg-sidebar-active text-primary"
                    : "text-muted-strong hover:bg-panel-subtle hover:text-foreground",
                ].join(" ")}
                href={href}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-md border border-panel-border bg-panel p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted">
              Workspace
            </p>
            <p className="mt-2 truncate text-sm font-medium">
              {workspace.organization.name}
            </p>
            <p className="mt-1 text-xs text-muted">
              {canManage ? "Gerenciamento ativo" : "Acesso de membro"}
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="flex h-16 items-center justify-between gap-4 border-b border-panel-border bg-background/95 px-5 md:px-8">
            <Button asChild size="sm" variant="ghost">
              <Link href="/app">
                <ChevronLeft className="size-4" />
                Dashboard
              </Link>
            </Button>
            <UserMenu
              email={workspace.profile.email}
              name={firstName}
              organization={workspace.organization.name}
              role={workspace.membership.role}
            />
          </header>

          <MotionPage className="mx-auto grid max-w-6xl gap-6 px-5 py-8 md:px-8 xl:grid-cols-[1fr_380px]">
            <section className="min-w-0 space-y-6">
              <div>
                <Badge>Assistentes oficiais</Badge>
                <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h1 className="text-4xl font-semibold tracking-normal">
                      Assistentes do workspace
                    </h1>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-muted-strong">
                      Cadastre especialistas de IA com instrucoes, area de
                      atuacao, modelo e temperatura controlados pela empresa.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:flex">
                    <Metric label="Total" value={assistants.length.toString()} />
                    <Metric
                      label="Padrao"
                      value={defaultAssistant?.name ?? "Nao definido"}
                    />
                  </div>
                </div>
              </div>

              {!canManage ? (
                <Card className="border-warning/50 bg-[#211d10]">
                  <CardContent className="flex items-start gap-3 p-4">
                    <Lock className="mt-0.5 size-4 text-warning" />
                    <div>
                      <p className="text-sm font-medium">
                        Modo somente leitura
                      </p>
                      <p className="mt-1 text-sm text-muted-strong">
                        Membros podem usar assistentes, mas apenas owners e
                        admins podem criar, editar, excluir ou alterar o padrao.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <div className="space-y-4">
                {assistants.length ? (
                  assistants.map((assistant) => (
                    <AssistantCard
                      assistant={assistant}
                      canManage={canManage}
                      key={assistant.id}
                    />
                  ))
                ) : (
                  <EmptyState canManage={canManage} />
                )}
              </div>
            </section>

            <aside className="space-y-6">
              <AssistantForm canManage={canManage} />

              <MotionSurface>
                <Card className="os-grid overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.12em]">
                      <BrainCircuit className="size-4 text-primary" />
                      Contrato operacional
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-strong">
                    <p>
                      Cada assistente pertence a uma organizacao e e filtrado
                      por RLS usando `organization_id`.
                    </p>
                    <p>
                      Mutacoes sao validadas com Zod e exigem papel owner/admin
                      no servidor.
                    </p>
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

function AssistantCard({
  assistant,
  canManage,
}: {
  assistant: AssistantListItem;
  canManage: boolean;
}) {
  const setDefaultAction = setDefaultAssistantAction.bind(null, assistant.id);
  const deleteAction = deleteAssistantAction.bind(null, assistant.id);

  return (
    <MotionSurface>
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between md:space-y-0">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sidebar-active text-primary">
              <Bot className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="truncate text-lg">
                  {assistant.name}
                </CardTitle>
                {assistant.area ? (
                  <span className="rounded-md border border-panel-border bg-panel-elevated px-2 py-1 text-xs text-muted-strong">
                    {assistant.area}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-strong">
                {assistant.description || "Sem descricao cadastrada."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canManage ? (
              <SetDefaultAssistantForm
                action={setDefaultAction}
                assistant={assistant}
              />
            ) : assistant.isDefault ? (
              <Badge>Padrao</Badge>
            ) : null}
            {canManage ? (
              <DeleteAssistantForm action={deleteAction} assistant={assistant} />
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <InfoTile
              icon={<SlidersHorizontal className="size-4" />}
              label="Temperatura"
              value={assistant.temperature.toFixed(1)}
            />
            <InfoTile label="Modelo" value={assistant.model} />
            <InfoTile
              label="Criado em"
              value={new Intl.DateTimeFormat("pt-BR").format(
                new Date(assistant.createdAt),
              )}
            />
          </div>

          <details className="group rounded-md border border-panel-border bg-panel-subtle">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-strong transition hover:text-primary">
              Instrucoes do assistente
            </summary>
            <p className="border-t border-panel-border px-4 py-3 text-sm leading-6 text-muted">
              {assistant.instructions}
            </p>
          </details>

          {canManage ? (
            <details className="rounded-md border border-panel-border bg-panel-subtle">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-primary">
                Editar configuracao
              </summary>
              <div className="border-t border-panel-border p-4">
                <AssistantForm
                  assistant={assistant}
                  canManage={canManage}
                  variant="inline"
                />
              </div>
            </details>
          ) : null}
        </CardContent>
      </Card>
    </MotionSurface>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-28 rounded-md border border-panel-border bg-panel px-3 py-2">
      <p className="text-xs uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-1 max-w-36 truncate text-sm font-semibold text-primary">
        {value}
      </p>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-panel-border bg-panel-elevated px-3 py-3">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-muted">
        {icon}
        {label}
      </p>
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
            <Plus className="size-6" />
          </span>
          <h2 className="mt-5 text-xl font-semibold">
            Nenhum assistente cadastrado
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-strong">
            {canManage
              ? "Crie o primeiro assistente oficial para padronizar como sua equipe usa IA."
              : "A equipe ainda nao cadastrou assistentes para este workspace."}
          </p>
        </CardContent>
      </Card>
    </MotionItem>
  );
}
