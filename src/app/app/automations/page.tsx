import { Clock3, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MotionPage } from "@/components/ui/motion";
import { ManualAutomationForm } from "@/features/automations/manual-automation-form";
import { listAutomationRuns } from "@/features/automations/queries";
import { getAutomationTemplate } from "@/features/automations/templates";
import { getEntitlements, hasFeature } from "@/features/billing/entitlements";
import { UpgradeCTA } from "@/features/billing/upgrade-cta";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AutomationsPage() {
  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const organizationId = workspace.organization.id;
  const entitlements = await getEntitlements(supabase, organizationId);

  if (!hasFeature(entitlements, "automations")) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
        <UpgradeCTA
          description={`Automacoes manuais nao estao liberadas no plano ${entitlements.plan.name}.`}
          feature="automations"
          planName={entitlements.plan.name}
          title="Automacoes indisponiveis neste plano"
        />
      </div>
    );
  }

  const runs = await listAutomationRuns(supabase, organizationId);

  return (
    <MotionPage className="mx-auto grid max-w-6xl gap-6 px-5 py-8 md:px-8 xl:grid-cols-[1fr_320px]">
      <section className="min-w-0 space-y-6">
        <div>
          <Badge>Execucao manual</Badge>
          <h1 className="mt-4 text-4xl font-semibold">Automacoes</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-strong">
            Execute rotinas de IA sob demanda. Todo resultado exige revisao
            humana antes de uso ou envio.
          </p>
        </div>
        <ManualAutomationForm />
      </section>

      <aside>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.1em]">
              <Clock3 className="size-4 text-primary" />
              Historico recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {runs.length ? (
              runs.map((run) => (
                <div
                  className="rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated p-3"
                  key={run.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {getRunName(run.templateId)}
                    </p>
                    <RunStatus status={run.status} />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      month: "2-digit",
                    }).format(new Date(run.createdAt))}
                  </p>
                  {run.error ? (
                    <p className="mt-2 line-clamp-2 text-xs text-danger">
                      {run.error}
                    </p>
                  ) : null}
                  {run.outputText ? (
                    <details className="mt-3 border-t border-panel-border pt-3">
                      <summary className="cursor-pointer text-xs font-medium text-primary">
                        Ver resultado
                      </summary>
                      <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-muted-strong">
                        {run.outputText}
                      </p>
                    </details>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="py-6 text-center">
                <Workflow className="mx-auto size-6 text-muted" />
                <p className="mt-3 text-sm text-muted-strong">
                  Nenhuma execucao registrada.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </aside>
    </MotionPage>
  );
}

function getRunName(templateId: string | null) {
  if (
    templateId === "summarize" ||
    templateId === "client_reply" ||
    templateId === "checklist" ||
    templateId === "report" ||
    templateId === "meeting_tasks" ||
    templateId === "spreadsheet_analysis"
  ) {
    return getAutomationTemplate(templateId).name;
  }
  return "Automacao manual";
}

function RunStatus({ status }: { status: "queued" | "running" | "succeeded" | "failed" }) {
  const labels = {
    queued: "Fila",
    running: "Executando",
    succeeded: "Concluida",
    failed: "Falhou",
  };
  return (
    <span className={status === "failed" ? "text-xs text-danger" : "text-xs text-primary"}>
      {labels[status]}
    </span>
  );
}
