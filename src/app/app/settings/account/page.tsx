import {
  Building2,
  Crown,
  Mail,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/app";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEntitlements } from "@/features/billing/entitlements";
import { IntegrationAuditForm } from "@/features/integration-audit/audit-form";
import { parseIntegrationAudit } from "@/features/integration-audit/audit";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountSettingsPage() {
  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const entitlements = await getEntitlements(
    supabase,
    workspace.organization.id,
  );
  const memberCount = await getOrganizationMemberCount(
    supabase,
    workspace.organization.id,
  );
  const canManage = ["owner", "admin"].includes(workspace.membership.role);
  const { data: auditRecord } = await supabase.from("integrations").select("config")
    .eq("organization_id", workspace.organization.id).eq("provider", "commerce_audit")
    .limit(1).maybeSingle();
  const parsedAudit = parseIntegrationAudit(auditRecord?.config);

  return (
    <section className="space-y-6">
      <PageHeader
        description="Informações principais da conta, responsável operacional e contexto da organização."
        eyebrow="Configurações"
        title="Conta"
      />

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="os-panel-glow">
          <CardHeader>
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-panel)] bg-sidebar-active text-primary">
                <Building2 className="size-6" />
              </span>
              <div className="min-w-0">
                <Badge>Workspace</Badge>
                <CardTitle className="mt-4 text-3xl">
                  {workspace.organization.name}
                </CardTitle>
                <p className="mt-2 font-mono text-sm text-muted">
                  {workspace.organization.slug}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <AccountMetric
              icon={<ShieldCheck className="size-4" />}
              label="Seu papel"
              value={getRoleLabel(workspace.membership.role)}
            />
            <AccountMetric
              icon={<Crown className="size-4" />}
              label="Plano atual"
              value={entitlements.plan.name}
            />
            <AccountMetric
              icon={<Users className="size-4" />}
              label="Membros ativos"
              value={String(memberCount)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.12em]">
              <UserRound className="size-4 text-primary" />
              Responsavel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xl font-semibold">
                {workspace.profile.name ?? "Usuario BEM HUB"}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-strong">
                <Mail className="size-4 text-primary" />
                {workspace.profile.email ?? workspace.user.email ?? "Sem e-mail"}
              </p>
            </div>
            <div className="rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-4 py-3 text-sm leading-6 text-muted-strong">
              Perfil responsável pela sessão atual. Dados editáveis e
              configurações de segurança entram aqui nas próximas etapas.
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Auditoria de dados comerciais</CardTitle>
          <p className="text-sm leading-6 text-muted-strong">Mapeie loja, API, PDV e planilhas antes de escolher ou construir um conector.</p>
        </CardHeader>
        <CardContent>
          <IntegrationAuditForm canManage={canManage} initial={parsedAudit.success ? parsedAudit.data : null} />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoCard
          title="Dados da organização"
          text="Nome, slug, domínio e preferências do workspace devem ficar centralizados nesta área."
        />
        <InfoCard
          title="Permissões"
          text="Acesso granular por papel, módulo e plano deve evoluir a partir da camada de entitlements."
        />
        <InfoCard
          title="Cobranca"
          text="Plano ativo, responsável financeiro e histórico de assinatura ficam no submenu Plano."
        />
      </section>
    </section>
  );
}

async function getOrganizationMemberCount(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
) {
  const { count, error } = await supabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (error) {
    throw new Error(`Falha ao contar membros: ${error.message}`);
  }

  return count ?? 0;
}

function AccountMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-4 py-4">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-muted">
        <span className="text-primary">{icon}</span>
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold">{value}</p>
    </div>
  );
}

function InfoCard({ text, title }: { text: string; title: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="font-medium">{title}</p>
        <p className="mt-2 text-sm leading-6 text-muted-strong">{text}</p>
      </CardContent>
    </Card>
  );
}

function getRoleLabel(role: "owner" | "admin" | "member") {
  if (role === "owner") {
    return "Owner";
  }

  if (role === "admin") {
    return "Admin";
  }

  return "Membro";
}
