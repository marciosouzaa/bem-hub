import { Headphones, MessageSquareText, Phone, UserRound } from "lucide-react";
import { PageHeader, PageLayout } from "@/components/app";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MotionPage, MotionSurface } from "@/components/ui/motion";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { listSupportInbox } from "@/features/support/queries";
import { listChannelConnections } from "@/features/support/queries";
import { ConnectionForm } from "@/features/support/connection-form";

export default async function SupportPage() {
  const workspace = await getRequiredWorkspace();
  const [conversations, connections] = await Promise.all([listSupportInbox(workspace.organization.id), listChannelConnections(workspace.organization.id)]);
  const canManage=["owner","admin"].includes(workspace.membership.role);

  return <MotionPage><PageLayout size="wide" className="space-y-7">
    <PageHeader eyebrow="Atendimento multicanal" title="Inbox de atendimento" description="Contatos e conversas de cada numero ficam isolados por canal. Oficial e nao oficial operam como conexoes independentes." />
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
      <aside className="space-y-4"><Card><CardContent className="p-5 md:pt-5"><p className="text-xs uppercase tracking-[0.12em] text-muted">Fila</p><div className="mt-4 grid grid-cols-2 gap-3"><Metric label="Abertos" value={conversations.filter((item) => item.status === "open").length} /><Metric label="Escalados" value={conversations.filter((item) => item.status === "escalated").length} /></div></CardContent></Card><Card><CardContent className="p-5 md:pt-5"><p className="text-sm font-medium">Numeros e canais</p><div className="my-4 space-y-2">{connections.map((connection)=><div className="rounded-md border border-panel-border bg-panel-elevated p-3 text-xs" key={connection.id}><p className="font-medium">{connection.name}</p><p className="mt-1 text-muted">{connection.phoneNumber} · {connection.kind === "official"?"Oficial":"Nao oficial"}</p></div>)}</div><ConnectionForm canManage={canManage}/><p className="mt-4 text-xs leading-5 text-muted">Fornecedor e credenciais serao definidos depois para cada numero.</p></CardContent></Card></aside>
      <section className="space-y-3">{conversations.length ? conversations.map((item) => <MotionSurface key={item.id}><Card><CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center md:pt-4"><div className="flex min-w-0 gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sidebar-active text-primary"><UserRound className="size-5" /></span><div className="min-w-0"><p className="truncate font-medium">{item.contact.name ?? item.contact.phone ?? "Contato sem nome"}</p><p className="mt-1 flex flex-wrap gap-3 text-xs text-muted"><span className="flex items-center gap-1"><Phone className="size-3" />{item.channel.phoneNumber}</span><span>{item.channel.name}</span></p></div></div><div className="flex items-center gap-2"><Badge>{item.channel.kind === "official" ? "Oficial" : "Nao oficial"}</Badge><span className="text-xs text-muted">{item.status}</span></div></CardContent></Card></MotionSurface>) : <Card><CardContent className="py-14 text-center"><MessageSquareText className="mx-auto size-7 text-muted" /><p className="mt-4 font-medium">Nenhum atendimento recebido</p><p className="mt-2 text-sm text-muted-strong">Cadastre uma conexao quando o fornecedor de cada numero for escolhido.</p></CardContent></Card>}</section>
    </div>
  </PageLayout></MotionPage>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated p-3"><Headphones className="size-4 text-primary" /><p className="mt-3 text-2xl font-semibold">{value}</p><p className="text-xs text-muted">{label}</p></div>; }
