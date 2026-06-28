import {
  ArrowUpRight,
  Bot,
  Check,
  Database,
  MessageSquareText,
  ShieldCheck,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MotionPage, MotionSurface } from "@/components/ui/motion";
import { getEntitlements } from "@/features/billing/entitlements";
import { planLimits, type PlanKey } from "@/features/billing/plans";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const planOrder: PlanKey[] = ["free", "starter", "pro", "business"];

const planCopy: Record<
  PlanKey,
  { name: string; price: string; description: string; signal: string }
> = {
  free: {
    name: "Free",
    price: "R$ 0",
    description: "Ponto de partida para validar assistentes e chat interno.",
    signal: "Validação",
  },
  starter: {
    name: "Starter",
    price: "R$ 79",
    description: "Para equipes pequenas usando IA em rotinas comerciais.",
    signal: "Operação inicial",
  },
  pro: {
    name: "Pro",
    price: "R$ 299",
    description: "Para empresas com múltiplos processos e base documental.",
    signal: "Mais indicado",
  },
  business: {
    name: "Business",
    price: "R$ 599",
    description: "Para operações maiores com mais usuários, volume e integrações.",
    signal: "Escala",
  },
};

const featureLabels: Record<string, string> = {
  chat: "Conversas com IA",
  assistants: "Assistentes oficiais",
  knowledgeBase: "Base de conhecimento",
  automations: "Automações",
  integrations: "Integrações",
};

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string }>;
}) {
  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const entitlements = await getEntitlements(
    supabase,
    workspace.organization.id,
  );
  const params = await searchParams;
  const featureLabel = params.feature
    ? featureLabels[params.feature] ?? params.feature
    : null;

  return (
    <MotionPage className="mx-auto max-w-6xl space-y-6 px-5 py-8 md:px-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="os-panel-glow">
          <CardContent className="p-6">
            <Badge>Plano e limites</Badge>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-normal">
              Libere módulos conforme a operação crescer
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-strong">
              O BEM HUB controla módulos e limites por organização. A cobrança
              ainda é manual neste MVP, mas os bloqueios server-side já usam o
              plano ativo.
            </p>
            {featureLabel ? (
              <div className="mt-5 rounded-md border border-warning/50 bg-panel-elevated px-4 py-3 text-sm text-muted-strong">
                <span className="font-medium text-warning">
                  Módulo solicitado:
                </span>{" "}
                {featureLabel}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.12em]">
              <ShieldCheck className="size-4 text-primary" />
              Assinatura atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{entitlements.plan.name}</p>
            <p className="mt-2 text-sm text-muted-strong">
              {workspace.organization.name}
            </p>
            <div className="mt-5 grid gap-2 text-sm">
              <UsageLine
                label="Assistentes"
                value={entitlements.plan.limits.assistants}
              />
              <UsageLine
                label="Mensagens/mês"
                value={entitlements.plan.limits.monthlyMessages}
              />
              <UsageLine
                label="Documentos"
                value={entitlements.plan.limits.documents}
              />
              <UsageLine
                label="Usuários"
                value={entitlements.plan.limits.users}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {planOrder.map((planKey) => (
          <PlanCard
            current={entitlements.plan.key === planKey}
            key={planKey}
            planKey={planKey}
          />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoCard
          icon={<MessageSquareText className="size-5" />}
          text="Chat e criação de assistentes já consultam o plano antes de executar a operação."
          title="Limites server-side"
        />
        <InfoCard
          icon={<Database className="size-5" />}
          text="Base de conhecimento, automações e integrações entram usando a mesma camada de entitlements."
          title="Próximos módulos"
        />
        <InfoCard
          icon={<Workflow className="size-5" />}
          text="Enquanto o gateway não entra no MVP, o CTA abre contato comercial com o plano desejado."
          title="Upgrade manual"
        />
      </section>
    </MotionPage>
  );
}

function PlanCard({
  current,
  planKey,
}: {
  current: boolean;
  planKey: PlanKey;
}) {
  const limits = planLimits[planKey];
  const copy = planCopy[planKey];
  const salesHref = `mailto:comercial@bemhub.com.br?subject=Upgrade%20BEM%20HUB%20-%20${copy.name}`;

  return (
    <MotionSurface>
      <Card
        className={[
          "flex h-full flex-col",
          current ? "border-primary bg-sidebar-active" : "bg-panel",
          planKey === "pro" ? "shadow-[var(--shadow-glow)]" : "",
        ].join(" ")}
      >
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <Badge>{copy.signal}</Badge>
            {current ? (
              <span className="rounded-md bg-panel px-2 py-1 text-xs text-primary">
                Atual
              </span>
            ) : null}
          </div>
          <CardTitle className="text-2xl">{copy.name}</CardTitle>
          <p className="text-sm leading-6 text-muted-strong">
            {copy.description}
          </p>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-5">
          <div>
            <span className="text-3xl font-semibold">{copy.price}</span>
            <span className="text-sm text-muted"> / mês</span>
          </div>

          <dl className="space-y-3 text-sm">
            <PlanLine
              icon={<Users className="size-4" />}
              label={`${limits.users} usuários`}
            />
            <PlanLine
              icon={<Bot className="size-4" />}
              label={`${limits.assistants} assistentes`}
            />
            <PlanLine
              icon={<MessageSquareText className="size-4" />}
              label={`${limits.monthlyMessages} mensagens/mês`}
            />
            <PlanLine
              icon={<Database className="size-4" />}
              label={`${limits.documents} documentos`}
            />
            <PlanLine
              icon={<Zap className="size-4" />}
              label={`${limits.integrations} integrações`}
            />
          </dl>

          <Button
            asChild
            className="mt-auto"
            variant={current ? "secondary" : "primary"}
          >
            <Link href={current ? "/app" : salesHref}>
              {current ? "Continuar no plano" : "Solicitar upgrade"}
              {!current ? <ArrowUpRight className="size-4" /> : null}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </MotionSurface>
  );
}

function PlanLine({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-strong">
      <span className="text-primary">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function UsageLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-panel-border bg-panel-elevated px-3 py-2">
      <span className="text-muted-strong">{label}</span>
      <span className="font-mono text-primary">{value}</span>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <span className="flex size-10 items-center justify-center rounded-md bg-sidebar-active text-primary">
          {icon}
        </span>
        <div className="mt-4 flex items-center gap-2">
          <Check className="size-4 text-primary" />
          <p className="font-medium">{title}</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-strong">{text}</p>
      </CardContent>
    </Card>
  );
}
