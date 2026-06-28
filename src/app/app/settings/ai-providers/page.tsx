import { KeyRound, PlugZap, ShieldCheck } from "lucide-react";
import { ContextPanel, PageHeader, SplitPanel } from "@/components/app";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MotionItem, MotionSurface } from "@/components/ui/motion";
import {
  deleteAiProviderConnectionAction,
  setDefaultAiProviderConnectionAction,
} from "@/features/ai-provider-connections/actions";
import {
  AiProviderConnectionForm,
  DeleteAiProviderConnectionForm,
  SetDefaultAiProviderConnectionForm,
} from "@/features/ai-provider-connections/connection-forms";
import {
  listAiProviderConnections,
  type AiProviderConnectionListItem,
} from "@/features/ai-provider-connections/queries";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { AI_PROVIDER_DEFINITIONS } from "@/lib/ai/providers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AiProvidersPage() {
  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const connections = await listAiProviderConnections(
    supabase,
    workspace.organization.id,
  );
  const canManage = ["owner", "admin"].includes(workspace.membership.role);

  return (
    <section className="space-y-6">
      <SplitPanel sidebarWidth="lg">
          <section className="min-w-0 space-y-6">
            <PageHeader
              description="Gerencie as chaves que o workspace pode usar em assistentes, agentes e automações. A seleção final do modelo acontece no cadastro do assistente."
              eyebrow="Configurações"
              title="Conexões de IA"
            />

            <div className="space-y-4">
              {connections.length ? (
                connections.map((connection) => (
                  <ConnectionCard
                    canManage={canManage}
                    connection={connection}
                    key={connection.id}
                  />
                ))
              ) : (
                <EmptyConnections />
              )}
            </div>
          </section>

          <ContextPanel>
            <AiProviderConnectionForm canManage={canManage} />

            <MotionSurface>
              <Card className="os-grid overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.12em]">
                    <ShieldCheck className="size-4 text-primary" />
                    Segurança
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-muted-strong">
                  <p>
                    As chaves são criptografadas com `APP_ENCRYPTION_KEY` antes
                    de serem persistidas.
                  </p>
                  <p>
                    A UI recebe apenas metadata: provider, status, modelo e
                    dica dos últimos caracteres.
                  </p>
                </CardContent>
              </Card>
            </MotionSurface>
          </ContextPanel>
      </SplitPanel>
    </section>
  );
}

function ConnectionCard({
  canManage,
  connection,
}: {
  canManage: boolean;
  connection: AiProviderConnectionListItem;
}) {
  const provider = AI_PROVIDER_DEFINITIONS[connection.provider];
  const setDefaultAction = setDefaultAiProviderConnectionAction.bind(
    null,
    connection.id,
  );
  const deleteAction = deleteAiProviderConnectionAction.bind(
    null,
    connection.id,
  );

  return (
    <MotionSurface>
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between md:space-y-0">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-sidebar-active text-primary">
              <PlugZap className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="truncate text-lg">
                  {connection.name}
                </CardTitle>
                <Badge>{provider.label}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-strong">
                {provider.description}
              </p>
            </div>
          </div>
          {canManage ? (
            <div className="flex shrink-0 items-center gap-2">
              <SetDefaultAiProviderConnectionForm
                action={setDefaultAction}
                connection={connection}
              />
              <DeleteAiProviderConnectionForm
                action={deleteAction}
                connection={connection}
              />
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <InfoTile label="Status" value={getStatusLabel(connection.status)} />
            <InfoTile
              label="Modelo padrão"
              value={connection.defaultModel ?? provider.defaultModel}
            />
            <InfoTile label="Chave" value={connection.keyHint ?? "Salva"} />
          </div>

          <div className="rounded-[var(--radius-control)] border border-panel-border bg-panel-subtle px-4 py-3">
            <p className="text-xs uppercase tracking-[0.08em] text-muted">
              Modelos disponíveis
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {connection.availableModels.length ? (
                connection.availableModels.map((model) => (
                  <span
                    className="rounded-[8px] border border-panel-border bg-panel-elevated px-2.5 py-1 font-mono text-xs text-muted-strong"
                    key={model}
                  >
                    {model}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted">Não informado.</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </MotionSurface>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 py-3">
      <p className="text-xs uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-2 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function EmptyConnections() {
  return (
    <MotionItem>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center px-6 py-12 text-center md:pt-12">
          <span className="flex size-12 items-center justify-center rounded-[var(--radius-control)] bg-sidebar-active text-primary">
            <KeyRound className="size-6" />
          </span>
          <h2 className="mt-5 text-xl font-semibold">
            Nenhuma conexão cadastrada
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-strong">
            Cadastre OpenAI, Claude ou Gemini para liberar a seleção de provider
            nos assistentes do workspace.
          </p>
        </CardContent>
      </Card>
    </MotionItem>
  );
}

function getStatusLabel(
  status: AiProviderConnectionListItem["status"],
) {
  if (status === "active") {
    return "Ativa";
  }

  if (status === "disabled") {
    return "Desativada";
  }

  return "Requer atenção";
}
